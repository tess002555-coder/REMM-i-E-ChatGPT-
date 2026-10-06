using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using RemmI.Data;
using RemmI.Models;

namespace RemmI;

public partial class MascotWindow : Window, IMascotHost
{
    private const int CurrentPanelLayoutVersion = 2;
    private const double MascotImageSize = 96;
    private const double BarWidth = 24;
    private const double BarHeight = 128;
    private const uint MonitorDefaultToNearest = 2;

    private RemmSettings _settings = new();
    private PanelWindow? _panelWindow;
    private bool _mousePressed;
    private bool _dragging;
    private bool _moved;
    private bool _positionReady;
    private double _dragStartLeft;
    private double _dragStartTop;
    private double _dragStartScreenX;
    private double _dragStartScreenY;
    private string _currentPose = "peek";

    public MascotWindow()
    {
        InitializeComponent();
        Loaded += MascotWindow_Loaded;
        Closing += (_, _) => SaveMascotPosition();
    }

    private void MascotWindow_Loaded(object sender, RoutedEventArgs e)
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
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Could not initialize REMM(i) mascot: {ex}");
            MessageBox.Show(
                "REMM(i)E tidak dapat menyiapkan mascot." + Environment.NewLine + Environment.NewLine + ex.Message,
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
            if (_settings.AutoSnap && IsImageMode)
                SnapToNearestSide();
        }

        SetPose(_panelWindow is not null ? "pointing" : _currentPose);
        _panelWindow?.ApplySettings(_settings);
    }

    public void RefreshPose() => SetPose(_currentPose);

    private bool IsImageMode =>
        string.Equals(_settings.MascotMode, "Image", StringComparison.OrdinalIgnoreCase);

    private double CurrentPeekOffset =>
        IsImageMode
            ? Width * (1.0 - Math.Clamp(_settings.PeekVisiblePercent, 10, 100) / 100.0)
            : 0;

    private void ConfigureMascotMode()
    {
        Width = IsImageMode ? MascotImageSize : BarWidth;
        Height = IsImageMode ? MascotImageSize : BarHeight;
        MascotImage.Visibility = IsImageMode ? Visibility.Visible : Visibility.Collapsed;
        BarVisual.Visibility = IsImageMode ? Visibility.Collapsed : Visibility.Visible;
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
            if (_settings.AutoSnap && IsImageMode)
                SnapToNearestSide();
            SetPose("peek");
            return;
        }

        _positionReady = true;
        SnapToPreferredSide();
        Top = area.Top + 48;
        SetPose("peek");
    }

    private void MascotSurface_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (ModeButton.IsMouseOver)
            return;

        _mousePressed = true;
        _dragging = _settings.DragEnabled;
        _moved = false;
        _dragStartLeft = Left;
        _dragStartTop = Top;
        var screenPoint = PointToScreen(e.GetPosition(MascotSurface));
        _dragStartScreenX = screenPoint.X;
        _dragStartScreenY = screenPoint.Y;
        MascotSurface.CaptureMouse();

        if (IsImageMode)
            SetPose("idle");
        e.Handled = true;
    }

    private void MascotSurface_PreviewMouseMove(object sender, MouseEventArgs e)
    {
        if (!_mousePressed || !_dragging || e.LeftButton != MouseButtonState.Pressed)
            return;

        var screenPoint = PointToScreen(e.GetPosition(MascotSurface));
        var transform = PresentationSource.FromVisual(this)?.CompositionTarget?.TransformToDevice;
        var dx = (screenPoint.X - _dragStartScreenX) / (transform?.M11 ?? 1.0);
        var dy = (screenPoint.Y - _dragStartScreenY) / (transform?.M22 ?? 1.0);
        if (!_moved && Math.Abs(dx) < 4 && Math.Abs(dy) < 4)
            return;

        _moved = true;
        Left = _dragStartLeft + dx;
        Top = _dragStartTop + dy;
    }

    private void MascotSurface_PreviewMouseLeftButtonUp(object sender, MouseButtonEventArgs e)
    {
        if (!_mousePressed)
            return;

        var moved = _dragging && _moved;
        _mousePressed = false;
        _dragging = false;
        _moved = false;
        if (MascotSurface.IsMouseCaptured)
            MascotSurface.ReleaseMouseCapture();

        if (moved)
        {
            if (_settings.AutoSnap)
                SnapToNearestSide();
            else
                ClampPositionToWorkingArea();
            SetPose(_settings.AutoSnap && IsImageMode ? "peek" : "idle");
            SaveMascotPosition();
        }
        else
        {
            SetPose("peek");
            OpenPanelWindow();
        }

        e.Handled = true;
    }

    private void MascotSurface_MouseEnter(object sender, MouseEventArgs e)
    {
        if (_mousePressed || _panelWindow is not null)
            return;

        if (_settings.AutoSnap && IsImageMode)
            ExpandFromPeek();
        SetPose("idle");
    }

    private void MascotSurface_MouseLeave(object sender, MouseEventArgs e)
    {
        if (_mousePressed || _panelWindow is not null)
            return;

        if (_settings.AutoSnap && IsImageMode)
            CollapseToPeek();
        SetPose("peek");
    }

    private void ModeButton_Click(object sender, RoutedEventArgs e) => ToggleMascotMode();

    private void ClampPositionToWorkingArea()
    {
        var area = GetWorkingAreaInDip();
        Left = Math.Max(area.Left, Math.Min(Left, area.Right - Width));
        Top = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
    }

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
        _settings.PeekVisiblePercent = Math.Clamp(_settings.PeekVisiblePercent, 10, 100);
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
        var uri = GetPoseUri(pose);
        try
        {
            var image = new BitmapImage();
            image.BeginInit();
            image.CacheOption = BitmapCacheOption.OnLoad;
            image.UriSource = uri;
            image.EndInit();
            image.Freeze();
            MascotImage.Source = image;

            var transform = new TransformGroup();
            if (pose == "idle")
                transform.Children.Add(new ScaleTransform(1.07, 1.07));
            else if (pose == "pointing")
            {
                transform.Children.Add(new ScaleTransform(1.09, 1.09));
                transform.Children.Add(new TranslateTransform(0, -3));
            }
            MascotImage.RenderTransform = transform;
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Could not load REMM(i) mascot pose '{pose}': {ex}");
        }
    }

    private Uri GetPoseUri(string pose)
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
            return new Uri("pack://application:,,,/Assets/mascot.png", UriKind.Absolute);

        var poseFolder = Path.GetFullPath(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "REMM-i",
            "poses"));
        var fullPath = Path.GetFullPath(path);
        if (!string.Equals(Path.GetDirectoryName(fullPath), poseFolder, StringComparison.OrdinalIgnoreCase))
            return new Uri("pack://application:,,,/Assets/mascot.png", UriKind.Absolute);
        return new Uri(fullPath, UriKind.Absolute);
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
            if (_settings.AutoSnap && IsImageMode && !MascotSurface.IsMouseOver)
                CollapseToPeek();
            SetPose(MascotSurface.IsMouseOver ? "idle" : "peek");
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
