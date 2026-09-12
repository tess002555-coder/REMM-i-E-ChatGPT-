using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media.Imaging;
using System.Windows.Controls;
using System.Windows.Interop;
using FormsScreen = System.Windows.Forms.Screen;

namespace RemmI;

public partial class MainWindow : Window
{
    private const double MascotSize = 150;
    private double _peekOffset = 37.5;
    private bool _dragging;
    private bool _moved;
    private System.Windows.Point _mouseDownScreen;
    private double _dragStartLeft;
    private double _dragStartTop;
    private RemmSettings _settings = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += (_, _) =>
        {
            _settings = RemmDataService.Load().Settings;
            ApplySettings(_settings);
            PositionInitial();
        };
    }

    public void ApplySettings(RemmSettings settings)
    {
        _settings = settings;
        _peekOffset = MascotSize * (1.0 - Math.Clamp(settings.PeekVisiblePercent, 50, 90) / 100.0);
        Topmost = true;
        if (_settings.PanelMode == "Floating")
            Topmost = true;
        SetPose("peek");
    }

    private void PositionInitial()
    {
        try
        {
            var area = GetWorkingAreaInDip();
            Left = area.Right - MascotSize + _peekOffset;
            Top = area.Top + (area.Height - MascotSize) / 2;
            SetPose("peek");
            Show();
        }
        catch
        {
            Left = 300;
            Top = 300;
            SetPose("idle");
            Show();
        }
    }

    private void Mascot_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (e.ChangedButton != System.Windows.Input.MouseButton.Left || !_settings.DragEnabled)
            return;

        _dragging = true;
        _moved = false;
        _mouseDownScreen = PointToScreen(e.GetPosition(this));
        _dragStartLeft = Left;
        _dragStartTop = Top;
        CaptureMouse();
        SetPose("idle");
        e.Handled = true;
    }

    private void Mascot_MouseMove(object sender, System.Windows.Input.MouseEventArgs e)
    {
        if (!_dragging || e.LeftButton != System.Windows.Input.MouseButtonState.Pressed)
            return;

        var current = PointToScreen(e.GetPosition(this));
        var dx = current.X - _mouseDownScreen.X;
        var dy = current.Y - _mouseDownScreen.Y;
        if (!_moved && Math.Abs(dx) < 5 && Math.Abs(dy) < 5)
            return;

        _moved = true;
        Left = _dragStartLeft + dx;
        Top = _dragStartTop + dy;
    }

    private void Mascot_MouseLeftButtonUp(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (!_dragging || e.ChangedButton != System.Windows.Input.MouseButton.Left)
            return;

        _dragging = false;
        ReleaseMouseCapture();

        if (_moved)
        {
            if (_settings.AutoSnap)
                SnapToNearestEdge();
            else
                SetPose("idle");
        }
        else
        {
            OpenTaskWindow();
        }

        e.Handled = true;
    }

    private void SnapToNearestEdge()
    {
        var area = GetWorkingAreaInDip();
        var maxLeft = area.Right - Width;
        var maxTop = area.Bottom - Height;
        var x = Math.Max(area.Left, Math.Min(Left, maxLeft));
        var y = Math.Max(area.Top, Math.Min(Top, maxTop));
        var left = x - area.Left;
        var right = maxLeft - x;
        var top = y - area.Top;
        var bottom = maxTop - y;
        var min = Math.Min(Math.Min(left, right), Math.Min(top, bottom));

        if (min == left) { Left = area.Left - _peekOffset; Top = y; }
        else if (min == right) { Left = maxLeft + _peekOffset; Top = y; }
        else if (min == top) { Left = x; Top = area.Top - _peekOffset; }
        else { Left = x; Top = maxTop + _peekOffset; }

        SetPose("peek");
    }

    private void OpenTaskWindow()
    {
        SetPose("pointing");
        var existing = Application.Current.Windows.OfType<TaskWindow>().FirstOrDefault();
        if (existing is not null)
        {
            existing.PositionNearMascot();
            existing.Show();
            existing.Activate();
            return;
        }

        var task = new TaskWindow(this);
        task.Show();
        task.Activate();
    }

    private void SetPose(string mode)
    {
        if (Content is not Grid grid)
            return;
        var image = grid.Children.OfType<Image>().FirstOrDefault();
        if (image is null)
            return;

        var path = mode switch
        {
            "idle" => _settings.IdleImagePath,
            "peek" => _settings.PeekImagePath,
            "pointing" => _settings.PointingImagePath,
            "alert" => _settings.AlertImagePath,
            _ => ""
        };

        if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
        {
            try
            {
                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.UriSource = new Uri(path, UriKind.Absolute);
                bitmap.EndInit();
                bitmap.Freeze();
                image.Source = bitmap;
                return;
            }
            catch
            {
            }
        }

        image.Source = new BitmapImage(new Uri("/Assets/mascot.png", UriKind.Relative));
    }

    public Rect GetWorkingAreaInDip()
    {
        var handle = new WindowInteropHelper(this).Handle;
        var screen = FormsScreen.FromHandle(handle);
        var transform = PresentationSource.FromVisual(this)?.CompositionTarget?.TransformToDevice;
        var sx = transform?.M11 ?? 1.0;
        var sy = transform?.M22 ?? 1.0;
        var r = screen.WorkingArea;
        return new Rect(r.Left / sx, r.Top / sy, r.Width / sx, r.Height / sy);
    }
}
