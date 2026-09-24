using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using FormsScreen = System.Windows.Forms.Screen;

namespace RemmI;

public partial class MainWindow : Window
{
    private const double MascotImageSize = 128;
    private const double BarWidth = 24;
    private const double BarHeight = 128;
    private const double ImagePeekPercent = 50;

    private double _peekOffset = MascotImageSize * 0.5;
    private bool _peekedOnRight = true;
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

        Loaded += (_, _) =>
        {
            _settings = RemmDataService.Load().Settings;
            ApplySettings(_settings);
            PositionInitial();
        };

        Closed += (_, _) =>
        {
            if (IsMouseCaptured)
                ReleaseMouseCapture();
        };
    }

    public void ApplySettings(RemmSettings settings)
    {
        _settings = settings ?? new RemmSettings();
        ConfigureMascotMode();

        // Normal desktop widget: other applications may appear above it.
        Topmost = false;

        SetPose(_taskWindow is not null ? "pointing" : "peek");
        _taskWindow?.ApplySettings(_settings);
    }

    private bool IsImageMode =>
        string.Equals(_settings.MascotMode, "Image", StringComparison.OrdinalIgnoreCase);

    private double CurrentPeekOffset =>
        IsImageMode ? MascotImageSize * (1.0 - ImagePeekPercent / 100.0) : 0;

    private void ConfigureMascotMode()
    {
        if (IsImageMode)
        {
            Width = MascotImageSize;
            Height = MascotImageSize;
            BarSurface.Visibility = Visibility.Collapsed;
            MascotImage.Visibility = Visibility.Visible;
            MascotImage.Width = MascotImageSize;
            MascotImage.Height = MascotImageSize;
            ModeToggleButton.HorizontalAlignment = HorizontalAlignment.Right;
            ModeToggleButton.VerticalAlignment = VerticalAlignment.Bottom;
            ModeToggleButton.Margin = new Thickness(0, 0, 4, 4);
        }
        else
        {
            Width = BarWidth;
            Height = BarHeight;
            BarSurface.Visibility = Visibility.Visible;
            MascotImage.Visibility = Visibility.Collapsed;
            ModeToggleButton.HorizontalAlignment = HorizontalAlignment.Center;
            ModeToggleButton.VerticalAlignment = VerticalAlignment.Bottom;
            ModeToggleButton.Margin = new Thickness(0, 0, 0, 5);
        }

        _peekOffset = CurrentPeekOffset;
    }

    private void PositionInitial()
    {
        try
        {
            var area = GetWorkingAreaInDip();
            _peekedOnRight = true;
            Left = IsImageMode
                ? area.Right - Width + CurrentPeekOffset
                : area.Right - Width;
            Top = area.Top + (area.Height - Height) / 2;
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
        if (_dragging || _taskWindow is not null || !IsImageMode)
            return;

        // In Image mode the pointer entering the visible 50% expands the mascot
        // to 100%, then switches from Peek to Idle.
        ExpandFromPeek();
        SetPose("idle");
    }

    private void Mascot_MouseLeave(object sender, MouseEventArgs e)
    {
        if (_dragging || _taskWindow is not null || !IsImageMode)
            return;

        CollapseToPeek();
        SetPose("peek");
    }

    private void ExpandFromPeek()
    {
        if (!IsImageMode)
            return;

        var area = GetWorkingAreaInDip();
        _peekedOnRight = (Left + Width / 2.0) >= area.Left + area.Width / 2.0;
        Left = _peekedOnRight ? area.Right - Width : area.Left;
    }

    private void CollapseToPeek()
    {
        if (!IsImageMode)
            return;

        var area = GetWorkingAreaInDip();
        Left = _peekedOnRight
            ? area.Right - Width + CurrentPeekOffset
            : area.Left - CurrentPeekOffset;
    }

    private void Mascot_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left)
            return;

        // The small Bar/Image toggle is inside this Window. Do not let the
        // window's drag handler steal its click.
        if (IsDescendantOf(e.OriginalSource as DependencyObject, ModeToggleButton))
            return;

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

        CaptureMouse();
        Cursor = Cursors.SizeAll;

        if (IsImageMode)
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

        // Completely free while dragging: no invisible working-area boundary.
        Left = _dragStartLeft + dx;
        Top = _dragStartTop + dy;

        e.Handled = true;
    }

    private void Mascot_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
    {
        if (!_dragging || e.ChangedButton != MouseButton.Left)
            return;

        _dragging = false;

        if (IsMouseCaptured)
            ReleaseMouseCapture();

        Cursor = Cursors.Hand;

        if (_moved)
        {
            if (_settings.AutoSnap)
                SnapToNearestSide();
            else if (IsImageMode)
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
        var y = Math.Max(area.Top, Math.Min(Top, maxTop));

        var mascotCenterX = Left + Width / 2.0;
        var distanceToLeft = Math.Abs(mascotCenterX - area.Left);
        var distanceToRight = Math.Abs(mascotCenterX - area.Right);
        _peekedOnRight = distanceToLeft > distanceToRight;

        var offset = CurrentPeekOffset;
        Left = _peekedOnRight
            ? area.Right - Width + offset
            : area.Left - offset;

        Top = y;

        if (IsImageMode)
            SetPose("peek");
    }

    private void OpenTaskWindow()
    {
        SetPose("pointing");

        if (_taskWindow is not null)
        {
            // Do not reposition an already-open panel. Mascot and panel remain
            // independently draggable.
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

    private void ModeToggleButton_Click(object sender, RoutedEventArgs e)
    {
        _settings.MascotMode = IsImageMode ? "Bar" : "Image";
        _settings.PeekVisiblePercent = 50;
        RemmDataService.Save(new RemmData
        {
            Settings = _settings,
            DisplayName = RemmDataService.Load().DisplayName,
            Tasks = RemmDataService.Load().Tasks,
            Routines = RemmDataService.Load().Routines,
            Schedules = RemmDataService.Load().Schedules
        });

        ConfigureMascotMode();
        SnapToPreferredSide();
        SetPose(_taskWindow is not null ? "pointing" : "peek");
    }

    private void SnapToPreferredSide()
    {
        var area = GetWorkingAreaInDip();
        _peekedOnRight = true;

        Left = IsImageMode
            ? area.Right - Width + CurrentPeekOffset
            : area.Right - Width;

        Top = Math.Max(area.Top, Math.Min(Top, area.Bottom - Height));
    }

    private void SetPose(string mode)
    {
        if (!IsImageMode)
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
                MascotImage.Source = bitmap;
                return;
            }
            catch
            {
                // Fall through to the bundled mascot.
            }
        }

        try
        {
            MascotImage.Source = new BitmapImage(new Uri("/Assets/mascot.png", UriKind.Relative));
        }
        catch
        {
            MascotImage.Source = null;
        }
    }

    private static bool IsDescendantOf(DependencyObject? source, DependencyObject target)
    {
        while (source is not null)
        {
            if (ReferenceEquals(source, target))
                return true;

            source = VisualTreeHelper.GetParent(source);
        }

        return false;
    }

    public bool IsTaskWindowOpen => _taskWindow is not null;

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
