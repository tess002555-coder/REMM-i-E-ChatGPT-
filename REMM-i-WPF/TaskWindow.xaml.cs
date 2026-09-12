using System.Windows;

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
        var y = System.Math.Max(area.Top, System.Math.Min(centerY - Height / 2, area.Bottom - Height));

        Left = x;
        Top = y;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();

    private static void Info(string message, string title)
        => System.Windows.MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);

    private void Download_Click(object sender, RoutedEventArgs e) => Info("Fitur unduh akan ditambahkan.", "REMM(i)");
    private void Settings_Click(object sender, RoutedEventArgs e) => Info("Pengaturan akan ditambahkan.", "REMM(i)");
    private void Layout_Click(object sender, RoutedEventArgs e) => Info("Pengaturan tampilan akan ditambahkan.", "REMM(i)");
    private void Console_Click(object sender, RoutedEventArgs e) => Info("Console akan ditambahkan.", "REMM(i)");

    private void AddCalendar_Click(object sender, RoutedEventArgs e) => Info("Tambah kalender akan ditambahkan.", "Calender");
    private void CalendarDetail_Click(object sender, RoutedEventArgs e) => Info("Detail kalender akan ditambahkan.", "Calender");
    private void AddRoutine_Click(object sender, RoutedEventArgs e) => Info("Tambah rutinitas akan ditambahkan.", "Rutinitas");
    private void AddTask_Click(object sender, RoutedEventArgs e) => Info("Tambah tugas akan ditambahkan.", "Tugas");
    private void FilterAll_Click(object sender, RoutedEventArgs e) { }
    private void FilterHigh_Click(object sender, RoutedEventArgs e) { }
    private void FilterMedium_Click(object sender, RoutedEventArgs e) { }
    private void FilterLow_Click(object sender, RoutedEventArgs e) { }
    private void SearchBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e) { }
}
