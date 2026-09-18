using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using System.Windows.Input;
using System.Windows.Interop;
using FormsScreen = System.Windows.Forms.Screen;

namespace RemmI;

public partial class MainWindow : Window
{
    private const double MascotSize = 128;
    private double _peekOffset = 32;
    private bool _dragging;
    private bool _moved;
    private Point _mouseDownScreen;
    private double _dragStartLeft;
    private double _dragStartTop;
    private RemmSettings _settings = new();
    private TaskWindow? _taskWindow;

    public MainWindow()
    {
        InitializeComponent();
        Width = MascotSize;
        Height = MascotSize;

        Loaded += (_, _) =>
        {
            _settings = RemmDataService.Load().Settings;
            ApplySettings(_settings);
            PositionInitial();
        };

        Closed += (_, _) =>
        {
            if (MascotSurface.IsMouseCaptured)
                MascotSurface.ReleaseMouseCapture();
        };
    }

    public void ApplySettings(RemmSettings settings)
    {
        _settings = settings;
        _peekOffset = MascotSize * (1.0 - Math.Clamp(settings.PeekVisiblePercent, 50, 90) / 100.0);

        // The mascot is a normal desktop widget, not an always-on-top overlay.
        Topmost = false;

        SetPose(_taskWindow is not null ? "pointing" : "peek");
        _taskWindow?.ApplySettings(settings);
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

    private void Mascot_MouseEnter(object sender, MouseEventArgs e)
    {
        if (!_dragging && _taskWindow is null)
            SetPose("idle");
    }

    private void Mascot_MouseLeave(object sender, MouseEventArgs e)
    {
        if (!_dragging && _taskWindow is null)
            SetPose("peek");
    }

    private void Mascot_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left)
            return;

        // Drag can be disabled independently from clicking the mascot.
        if (!_settings.DragEnabled)
        {
            OpenTaskWindow();
            e.Handled = true;
            return;
        }

        _dragging = true;
        _moved = false;
        _mouseDownScreen = PointToScreen(e.GetPosition(this));
        _dragStartLeft = Left;
        _dragStartTop = Top;

        // IMPORTANT: capture the same element that owns MouseMove/MouseUp.
        // Capturing the Window while handling the Grid event prevents the Grid
        // handlers from receiving the release event and leaves the mascot stuck.
        MascotSurface.CaptureMouse();

        MascotSurface.Cursor = Cursors.SizeAll;
        SetPose("idle");
        e.Handled = true;
    }

    private void Mascot_MouseMove(object sender, MouseEventArgs e)
    {
        if (!_dragging || e.LeftButton != MouseButtonState.Pressed)
            return;

        var current = PointToScreen(e.GetPosition(this));
        var transform = PresentationSource.FromVisual(this)?.CompositionTarget?.TransformToDevice;
        var sx = transform?.M11 ?? 1.0;
        var sy = transform?.M22 ?? 1.0;
        var dx = (current.X - _mouseDownScreen.X) / sx;
        var dy = (current.Y - _mouseDownScreen.Y) / sy;

        if (!_moved && Math.Abs(dx) < 5 && Math.Abs(dy) < 5)
            return;

        _moved = true;

        // Free drag: no working-area clamp while the pointer is held.
        Left = _dragStartLeft + dx;
        Top = _dragStartTop + dy;

        e.Handled = true;
    }

    private void Mascot_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
    {
        if (!_dragging || e.ChangedButton != MouseButton.Left)
            return;

        _dragging = false;

        if (MascotSurface.IsMouseCaptured)
            MascotSurface.ReleaseMouseCapture();

        MascotSurface.Cursor = Cursors.Hand;

        if (_moved)
        {
            if (_settings.AutoSnap)
                SnapToNearestSide();
            else
                SetPose("idle");
        }
        else
        {
            OpenTaskWindow();
        }

        e.Handled = true;
    }

    private void SnapToNearestSide()
    {
        var area = GetWorkingAreaInDip();
        var maxTop = area.Bottom - Height;

        // Only left/right are valid snap destinations. Vertical position is kept.
        var y = Math.Max(area.Top, Math.Min(Top, maxTop));
        var mascotCenterX = Left + Width / 2.0;
        var distanceToLeft = Math.Abs(mascotCenterX - area.Left);
        var distanceToRight = Math.Abs(mascotCenterX - area.Right);

        if (distanceToLeft <= distanceToRight)
            Left = area.Left - _peekOffset;
        else
            Left = area.Right - Width + _peekOffset;

        Top = y;
        SetPose("peek");
    }

    private void OpenTaskWindow()
    {
        SetPose("pointing");

        if (_taskWindow is not null)
        {
            _taskWindow.PositionNearMascot();
            _taskWindow.Show();
            _taskWindow.Activate();
            return;
        }

        var task = new TaskWindow(this);
        _taskWindow = task;
        task.Closed += (_, _) =>
        {
            _taskWindow = null;
            SetPose("peek");
        };
        task.Show();
        task.Activate();
    }

    public bool IsTaskWindowOpen => _taskWindow is not null;

    private void SetPose(string mode)
    {
        if (MascotSurface.Children.OfType<Image>().FirstOrDefault() is not Image image)
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
                // Fall through to the bundled mascot.
            }
        }

        try
        {
            image.Source = new BitmapImage(new Uri("/Assets/mascot.png", UriKind.Relative));
        }
        catch
        {
            image.Source = null;
        }
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
