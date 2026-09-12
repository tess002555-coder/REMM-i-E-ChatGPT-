using System;
using System.Linq;
using System.Windows;
using System.Windows.Forms;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Threading;

namespace RemmI;

public partial class MainWindow : Window
{
    private const double MascotSize = 180;
    private const double Peek = 45;
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

    private void Mascot_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left)
            return;

        var start = PointToScreen(e.GetPosition(this));
        _mouseDownScreen = start;
        _dragStartLeft = Left;
        _dragStartTop = Top;

        try
        {
            DragMove();
        }
        finally
        {
            var end = PointToScreen(e.GetPosition(this));
            var moved = Math.Abs(end.X - _mouseDownScreen.X) > 6 ||
                        Math.Abs(end.Y - _mouseDownScreen.Y) > 6 ||
                        Math.Abs(Left - _dragStartLeft) > 6 ||
                        Math.Abs(Top - _dragStartTop) > 6;

            SnapToNearestEdge();

            if (!moved)
                Dispatcher.BeginInvoke(new Action(OpenTaskWindow), DispatcherPriority.Background);
        }
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
        var existing = Application.Current.Windows.OfType<TaskWindow>().FirstOrDefault();
        if (existing is not null)
        {
            existing.PositionNearMascot();
            existing.Show();
            existing.Activate();
            return;
        }

        var task = new TaskWindow(this);
        task.Closed += (_, _) => Show();
        task.Show();
        task.Activate();
        Hide();
    }

    public Rect GetWorkingAreaInDip()
    {
        var handle = new WindowInteropHelper(this).Handle;
        var screen = Screen.FromHandle(handle);
        var transform = PresentationSource.FromVisual(this)?.CompositionTarget?.TransformToDevice;
        var sx = transform?.M11 ?? 1.0;
        var sy = transform?.M22 ?? 1.0;
        var r = screen.WorkingArea;
        return new Rect(r.Left / sx, r.Top / sy, r.Width / sx, r.Height / sy);
    }
}
