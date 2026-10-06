using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows;
using System.Windows.Interop;
using RemmI.Data;
using RemmI.Models;

namespace RemmI;

public partial class MascotWindow : Window, IMascotHost
{
    private const int CurrentPanelLayoutVersion = 2;
    private const double MascotImageSize = 96;
    private const double BarWidth = 24;
    private const double BarHeight = 128;
    private const double ImagePeekPercent = 50;
    private const uint MonitorDefaultToNearest = 2;

    private RemmSettings _settings = new();
    private PanelWindow? _panelWindow;
    private bool _dragging;
    private bool _moved;
    private bool _positionReady;
    private double _dragStartLeft;
    private double _dragStartTop;
    private string _currentPose = "peek";

    public MascotWindow()
    {
        InitializeComponent();
        Loaded += MascotWindow_Loaded;
        Closing += (_, _) => SaveMascotPosition();
    }

    private async void MascotWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var data = RemmDataService.Load();
            _settings = data.Settings;
            if (_settings.PanelLayoutVersion < CurrentPanelLayoutVersion)
            {
                _settings.MascotMode = "Image";
                _settings.PanelLeft = double.NaN;
                _settings.PanelTop = double.NaN;
                _settings.PanelLayoutVersion = CurrentPanelLayoutVersion;
                _settings.RememberPanelPosition = true;
                _settings.RememberMascotPosition = true;
                data.Settings = _settings;
                RemmDataService.Save(data);
            }

            ApplySettings(_settings);
            PositionInitial();
            Show();
            await WebViewHostService.InitializeAsync(Browser, "mascot", OnBrowserMessage);
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Could not initialize REMM(i) mascot WebView: {ex}");
            MessageBox.Show(
                $"REMM(i)E tidak dapat menyiapkan mascot.\n\n{ex.Message}\n\nPastikan WebView2 Runtime terpasang dan folder WebUI tersedia.",
                "REMM(i)E",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    public bool IsPanelWindowOpen => _panelWindow is not null;

    public void ApplySettings(RemmSettings settings)
    {
        _settings = settings ?? new RemmSettings();
        ConfigureMascotMode();
        Topmost = _settings.AlwaysOnTop;
        if (_positionReady && _settings.RememberMascotPosition
            && double.IsFinite(_settings.MascotLeft) && double.IsFinite(_settings.MascotTop))
        {
            var area = GetWorkingAreaInDip();
            Left = Math.Max(area.Left, Math.Min(_settings.MascotLeft, area.Right - Width));
            Top = Math.Max(area.Top, Math.Min(_settings.MascotTop, area.Bottom - Height));
        }
        SetPose(_panelWindow is not null ? "pointing" : _currentPose);
        _panelWindow?.ApplySettings(_settings);
    }

    public void RefreshPose() => SetPose(_currentPose);

    private bool IsImageMode =>
        string.Equals(_settings.MascotMode, "Image", StringComparison.OrdinalIgnoreCase);

    private double CurrentPeekOffset =>
        IsImageMode ? MascotImageSize * (1.0 - ImagePeekPercent / 100.0) : 0;

    private void ConfigureMascotMode()
    {
        Width = IsImageMode ? MascotImageSize : BarWidth;
        Height = IsImageMode ? MascotImageSize : BarHeight;
    }

    private void PositionInitial()
    {
        var area = GetWorkingAreaInDip();
        if (_settings.RememberMascotPosition
            && double.IsFinite(_settings.MascotLeft)
            && double.IsFinite(_settings.MascotTop))
        {
            Left = Math.Max(area.Left, Math.Min(_settings.MascotLeft, area.Right - Width));
            Top = Math.Max(area.Top, Math.Min(_settings.MascotTop, area.Bottom - Height));
            _positionReady = true;
            SetPose("peek");
            return;
        }

        _positionReady = true;
        SnapToPreferredSide();
        Top = area.Top + 48;
        SetPose("peek");
    }

    private void OnBrowserMessage(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!WebViewHostService.IsTrustedSource(e.Source))
            return;

        try
        {
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            if (!message.RootElement.TryGetProperty("type", out var typeElement))
                return;

            switch (typeElement.GetString())
            {
                case "mascot.ready":
                    SetPose(_currentPose);
                    break;
                case "mascot.hover":
                    HandleHover(message.RootElement);
                    break;
                case "mascot.drag.start":
                    BeginDrag();
                    break;
                case "mascot.drag.move":
                    MoveDrag(message.RootElement);
                    break;
                case "mascot.drag.end":
                    EndDrag(message.RootElement);
                    break;
                case "mascot.toggle":
                    ToggleMascotMode();
                    break;
                case "app.exit":
                    Application.Current.Shutdown();
                    break;
            }
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Invalid mascot WebView message: {ex}");
        }
    }

    private void HandleHover(JsonElement message)
    {
        if (_dragging || _panelWindow is not null || !IsImageMode)
            return;

        var hovered = message.TryGetProperty("hovered", out var value) && value.ValueKind == JsonValueKind.True;
        if (hovered)
        {
            ExpandFromPeek();
            SetPose("idle");
        }
        else
        {
            CollapseToPeek();
            SetPose("peek");
        }
    }

    private void BeginDrag()
    {
        if (!_settings.DragEnabled)
        {
            _dragging = false;
            return;
        }

        _dragging = true;
        _moved = false;
        _dragStartLeft = Left;
        _dragStartTop = Top;
        if (IsImageMode)
            SetPose("idle");
    }

    private void MoveDrag(JsonElement message)
    {
        if (!_dragging)
            return;

        var dx = GetNumber(message, "dx");
        var dy = GetNumber(message, "dy");
        if (Math.Abs(dx) < 4 && Math.Abs(dy) < 4)
            return;

        _moved = true;
        Left = _dragStartLeft + dx;
        Top = _dragStartTop + dy;
    }

    private void EndDrag(JsonElement message)
    {
        var wasDragging = _dragging;
        _dragging = false;
        var moved = _moved || (message.TryGetProperty("moved", out var movedValue) && movedValue.ValueKind == JsonValueKind.True);
        _moved = false;

        if (!wasDragging)
        {
            if (!_settings.DragEnabled)
                OpenPanelWindow();
            return;
        }

        if (moved)
        {
            if (_settings.AutoSnap)
                SnapToNearestSide();
            SaveMascotPosition();
        }
        else
        {
            OpenPanelWindow();
        }
    }

    private static double GetNumber(JsonElement message, string name) =>
        message.TryGetProperty(name, out var value) && value.TryGetDouble(out var result) && double.IsFinite(result)
            ? result
            : 0;

    private void ExpandFromPeek()
    {
        if (!IsImageMode)
            return;
        var area = GetWorkingAreaInDip();
        var onRight = Left + Width / 2.0 >= area.Left + area.Width / 2.0;
        Left = onRight ? area.Right - Width : area.Left;
    }

    private void CollapseToPeek()
    {
        if (!IsImageMode)
            return;
        var area = GetWorkingAreaInDip();
        var onRight = Left + Width / 2.0 >= area.Left + area.Width / 2.0;
        Left = onRight ? area.Right - Width + CurrentPeekOffset : area.Left - CurrentPeekOffset;
    }

    private void SnapToNearestSide()
    {
        var area = GetWorkingAreaInDip();
        Top = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
        var center = Left + Width / 2.0;
        var onRight = Math.Abs(center - area.Right) < Math.Abs(center - area.Left);
        Left = onRight ? area.Right - Width + CurrentPeekOffset : area.Left - CurrentPeekOffset;
        SetPose("peek");
    }

    private void SnapToPreferredSide()
    {
        var area = GetWorkingAreaInDip();
        Left = IsImageMode ? area.Right - Width + CurrentPeekOffset : area.Right - Width;
    }

    private void ToggleMascotMode()
    {
        var data = RemmDataService.Load();
        _settings = data.Settings;
        _settings.MascotMode = IsImageMode ? "Bar" : "Image";
        _settings.PeekVisiblePercent = 50;
        ConfigureMascotMode();
        SnapToPreferredSide();
        var area = GetWorkingAreaInDip();
        Top = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
        data.Settings = _settings;
        RemmDataService.Save(data);
        SetPose(_panelWindow is not null ? "pointing" : "peek");
        SaveMascotPosition();
    }

    private void SetPose(string pose)
    {
        _currentPose = pose;
        if (Browser.CoreWebView2 is null)
            return;

        var payload = JsonSerializer.Serialize(new
        {
            type = "mascot.pose",
            pose,
            mode = _settings.MascotMode,
            src = GetPoseSource(pose)
        });
        Browser.CoreWebView2.PostWebMessageAsJson(payload);
    }

    private string GetPoseSource(string pose)
    {
        var path = pose switch
        {
            "idle" => _settings.IdleImagePath,
            "peek" => _settings.PeekImagePath,
            "pointing" => _settings.PointingImagePath,
            "alert" => _settings.AlertImagePath,
            _ => ""
        };

        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            return "https://app.local/assets/mascot.png";

        var poseFolder = Path.GetFullPath(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "REMM-i",
            "poses"));
        var fullPath = Path.GetFullPath(path);
        if (!string.Equals(Path.GetDirectoryName(fullPath), poseFolder, StringComparison.OrdinalIgnoreCase))
            return "https://app.local/assets/mascot.png";
        return $"https://pose.local/{Uri.EscapeDataString(Path.GetFileName(fullPath))}";
    }

    private void OpenPanelWindow()
    {
        SetPose("pointing");
        if (_panelWindow is not null)
        {
            _panelWindow.Show();
            _panelWindow.Activate();
            return;
        }

        var panel = new PanelWindow(this);
        _panelWindow = panel;
        panel.Closed += (_, _) =>
        {
            _panelWindow = null;
            SetPose("peek");
        };
        panel.Show();
        panel.Activate();
    }

    private void SaveMascotPosition()
    {
        if (!_positionReady || !_settings.RememberMascotPosition || !double.IsFinite(Left) || !double.IsFinite(Top))
            return;

        try
        {
            var data = RemmDataService.Load();
            data.Settings.MascotLeft = Left;
            data.Settings.MascotTop = Top;
            data.Settings.RememberMascotPosition = true;
            RemmDataService.Save(data);
            _settings = data.Settings;
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Could not save REMM(i) mascot position: {ex}");
        }
    }

    public Rect GetWorkingAreaInDip()
    {
        var handle = new WindowInteropHelper(this).Handle;
        var monitor = MonitorFromWindow(handle, MonitorDefaultToNearest);
        var info = new MonitorInfo { Size = Marshal.SizeOf<MonitorInfo>() };
        if (monitor == IntPtr.Zero || !GetMonitorInfo(monitor, ref info))
            return SystemParameters.WorkArea;

        var transform = PresentationSource.FromVisual(this)?.CompositionTarget?.TransformToDevice;
        var scaleX = transform?.M11 ?? 1.0;
        var scaleY = transform?.M22 ?? 1.0;
        return new Rect(
            info.Work.Left / scaleX,
            info.Work.Top / scaleY,
            (info.Work.Right - info.Work.Left) / scaleX,
            (info.Work.Bottom - info.Work.Top) / scaleY);
    }

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo monitorInfo);

    [StructLayout(LayoutKind.Sequential)]
    private struct MonitorInfo
    {
        public int Size;
        public NativeRect Monitor;
        public NativeRect Work;
        public uint Flags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativeRect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
