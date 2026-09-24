using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using Microsoft.Win32;
using System.IO;
using System.Text.Json;
using System.Windows.Controls;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfFontStyles = System.Windows.FontStyles;
using WpfMessageBox = System.Windows.MessageBox;
using WpfMessageBoxButton = System.Windows.MessageBoxButton;
using WpfMessageBoxImage = System.Windows.MessageBoxImage;
using WpfMessageBoxResult = System.Windows.MessageBoxResult;

namespace RemmI;

public partial class RoutineWindow : Window
{
    private readonly RemmData _data;
    private readonly string _routineId;
    private RemmRoutine? Routine => _data.Routines.FirstOrDefault(r => r.Id == _routineId);

    public RoutineWindow(Window owner, RemmData data, string routineId)
    {
        InitializeComponent();
        Owner = owner;
        _data = data;
        _routineId = routineId;
        Loaded += (_, _) => Refresh();
    }

    private void Refresh()
    {
        var routine = Routine;
        if (routine is null) { Close(); return; }
        RoutineTitle.Text = routine.Title;
        NotesBox.Text = routine.Notes;
        MonthText.Text = DateTime.Today.ToString("MMMM yyyy", CultureInfo.GetCultureInfo("id-ID"));
        CalendarGrid.Children.Clear();
        foreach (var name in new[] { "Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb" })
            CalendarGrid.Children.Add(new TextBlock { Text = name, Foreground = WpfBrushes.Gray, FontSize = 7.5, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 2, 0, 2) });
        var first = (int)new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).DayOfWeek;
        for (var i = 0; i < first; i++) CalendarGrid.Children.Add(new Border { Height = 27 });
        for (var day = 1; day <= DateTime.DaysInMonth(DateTime.Today.Year, DateTime.Today.Month); day++)
        {
            var date = new DateTime(DateTime.Today.Year, DateTime.Today.Month, day);
            var active = date.Date == routine.CreatedDate.Date;
            CalendarGrid.Children.Add(new Border { Height = 27, Margin = new Thickness(2), CornerRadius = new CornerRadius(5), Background = active ? Brush("#12343B") : Brush("#20242A"), BorderBrush = active ? Brush("#22D3EE") : Brush("#303742"), BorderThickness = new Thickness(1), Child = new TextBlock { Text = day.ToString(), Foreground = active ? Brush("#22D3EE") : WpfBrushes.LightGray, FontSize = 8, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center } });
        }
    }

    private static System.Windows.Media.Brush Brush(string hex) => (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString(hex)!;
    private void Save_Click(object sender, RoutedEventArgs e) { var routine = Routine; if (routine is null) return; routine.Notes = NotesBox.Text.Trim(); RemmDataService.Save(_data); Close(); }
    private void Delete_Click(object sender, RoutedEventArgs e)
    {
        var routine = Routine;
        if (routine is null) return;
        if (WpfMessageBox.Show($"Hapus rutinitas '{routine.Title}'?", "REMM(i)", WpfMessageBoxButton.YesNo, WpfMessageBoxImage.Warning) == WpfMessageBoxResult.Yes)
        { _data.Routines.Remove(routine); RemmDataService.Save(_data); Close(); }
    }
    private void Export_Click(object sender, RoutedEventArgs e)
    {
        var routine = Routine;
        if (routine is null) return;

        var dialog = new SaveFileDialog
        {
            FileName = $"REMM-rutinitas-{routine.Title.Replace(" ", "-")}.json",
            Filter = "REMM Routine (*.json)|*.json|Text (*.txt)|*.txt"
        };
        if (dialog.ShowDialog() != true) return;

        try
        {
            if (Path.GetExtension(dialog.FileName).Equals(".txt", StringComparison.OrdinalIgnoreCase))
            {
                File.WriteAllText(dialog.FileName,
                    $"REMM(i)E - DETAIL RUTINITAS\n\nNama: {routine.Title}\nDibuat: {routine.CreatedDate:dd MMM yyyy}\n\nCatatan:\n{routine.Notes}");
            }
            else
            {
                File.WriteAllText(dialog.FileName,
                    JsonSerializer.Serialize(routine, new JsonSerializerOptions { WriteIndented = true }));
            }

            WpfMessageBox.Show("Rutinitas berhasil diekspor.", "Ekspor Rutinitas", WpfMessageBoxButton.OK, WpfMessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show($"Ekspor gagal:\n{ex.Message}", "REMM(i)", WpfMessageBoxButton.OK, WpfMessageBoxImage.Error);
        }
    }
    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
