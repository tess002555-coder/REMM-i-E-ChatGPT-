using System;
using System.Windows;
using System.Windows.Interop;

namespace RemmI;

public partial class TaskWindow : Window
{
    private readonly MainWindow _mascot;

    public TaskWindow(MainWindow mascot)
    {
        InitializeComponent();
        _mascot = mascot;
        Loaded += (_, _) => PositionNearMascot();
    }

    public void PositionNearMascot()
    {
        var area = _mascot.GetWorkingAreaInDip();
        var centerX = _mascot.Left + (_mascot.Width / 2);
        var centerY = _mascot.Top + (_mascot.Height / 2);

        var x = centerX >= area.Left + area.Width / 2
            ? area.Right - Width
            : area.Left;
        var y = Math.Max(area.Top, Math.Min(centerY - Height / 2, area.Bottom - Height));

        Left = x;
        Top = y;
    }

    private void Close_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
