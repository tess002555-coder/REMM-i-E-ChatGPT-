using System;
using System.Linq;
using System.Windows;
using System.Windows.Interop;
using FormsScreen = System.Windows.Forms.Screen;

namespace RemmI;

public partial class MainWindow : Window
{
    private const double MascotSize = 150;
    private const double Peek = 37.5;
    private bool _dragging;
    private bool _moved;
    private System.Windows.Point _mouseDownScreen;
    private double _dragStartLeft;
    private double _dragStartTop;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += (_, _) => PositionInitial();
    }

    private void PositionInitial()
    {
        try
        {
            var area = GetWorkingAreaInDip();
            Left = area.Right - MascotSize + Peek;
            Top = area.Top + (area.Height - MascotSize) / 2;
            Show();
        }
        catch
        {
            Left = 300;
            Top = 300;
            Show();
        }
    }

    private void Mascot_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (e.ChangedButton != System.Windows.Input.MouseButton.Left)
            return;

        _dragging = true;
        _moved = false;
        _mouseDownScreen = PointToScreen(e.GetPosition(this));
        _dragStartLeft = Left;
        _dragStartTop = Top;
        CaptureMouse();
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
            SnapToNearestEdge();
        else
            OpenTaskWindow();

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

        if (min == left)
        {
            Left = area.Left - Peek;
            Top = y;
        }
        else if (min == right)
        {
            Left = maxLeft + Peek;
            Top = y;
        }
        else if (min == top)
        {
            Left = x;
            Top = area.Top - Peek;
        }
        else
        {
            Left = x;
            Top = maxTop + Peek;
        }
    }

    private void OpenTaskWindow()
    {
        var existing = System.Windows.Application.Current.Windows.OfType<TaskWindow>().FirstOrDefault();
        if (existing is not null)
        {
            existing.PositionNearMascot();
            existing.Show();
            existing.Activate();
            return;
        }

        var task = new TaskWindow(this);
        task.Closed += (_, _) => { };
        task.Show();
        task.Activate();
        // The mascot stays visible. The menu is an additional floating window.
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
