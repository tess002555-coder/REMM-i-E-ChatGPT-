using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfButton = System.Windows.Controls.Button;
using WpfCheckBox = System.Windows.Controls.CheckBox;
using WpfComboBox = System.Windows.Controls.ComboBox;
using WpfControl = System.Windows.Controls.Control;
using WpfDock = System.Windows.Controls.Dock;
using WpfDockPanel = System.Windows.Controls.DockPanel;
using WpfFontStyles = System.Windows.FontStyles;
using WpfFontWeights = System.Windows.FontWeights;
using WpfGrid = System.Windows.Controls.Grid;
using WpfHorizontalAlignment = System.Windows.HorizontalAlignment;
using WpfOrientation = System.Windows.Controls.Orientation;
using WpfRowDefinition = System.Windows.Controls.RowDefinition;
using WpfScrollBar = System.Windows.Controls.Primitives.ScrollBar;
using WpfSlider = System.Windows.Controls.Slider;
using WpfStackPanel = System.Windows.Controls.StackPanel;
using WpfTextBox = System.Windows.Controls.TextBox;
using WpfTextBlock = System.Windows.Controls.TextBlock;
using WpfTextChangedEventArgs = System.Windows.Controls.TextChangedEventArgs;
using WpfTextDecorations = System.Windows.TextDecorations;

namespace RemmI;

public partial class TaskWindow : Window
{
    private readonly MainWindow _mascot;
    private RemmData _data;
    private string _filter = "Semua";

    public TaskWindow(MainWindow mascot)
    {
        InitializeComponent();
        _mascot = mascot;
        _data = RemmDataService.Load();
        Loaded += (_, _) =>
        {
            Opacity = _data.Settings.PanelOpacity;
            PositionNearMascot();
            RefreshView();
        };
    }

    public void PositionNearMascot()
    {
        var area = _mascot.GetWorkingAreaInDip();
        var mascotLeft = _mascot.Left;
        var mascotRight = _mascot.Left + _mascot.Width;
        var mascotCenterX = mascotLeft + (_mascot.Width / 2);
        var mascotCenterY = _mascot.Top + (_mascot.Height / 2);
        const double gap = 10;
        var placeLeft = mascotCenterX >= area.Left + area.Width / 2;
        var x = placeLeft ? mascotLeft - Width - gap : mascotRight + gap;
        var y = mascotCenterY - (Height / 2);
        Left = Math.Max(area.Left, Math.Min(x, area.Right - Width));
        Top = Math.Max(area.Top, Math.Min(y, area.Bottom - Height));
    }

    private void Panel_PreviewMouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (e.ChangedButton != System.Windows.Input.MouseButton.Left)
            return;

        // The panel can be dragged from its background/cards/header, while
        // normal controls remain clickable and keep their own behavior.
        if (IsInteractiveSource(e.OriginalSource as DependencyObject))
            return;

        try
        {
            DragMove();
            e.Handled = true;
        }
        catch (InvalidOperationException)
        {
            // Ignore a mouse capture race while opening/closing controls.
        }
    }

    private static bool IsInteractiveSource(DependencyObject? source)
    {
        var current = source;
        while (current is not null)
        {
            if (current is WpfButton || current is WpfTextBox || current is WpfCheckBox ||
                current is WpfSlider || current is WpfComboBox || current is WpfScrollBar)
                return true;
            current = VisualTreeHelper.GetParent(current);
        }
        return false;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();

    private void Download_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new Microsoft.Win32.SaveFileDialog { FileName = "remm-backup.json", Filter = "REMM data (*.json)|*.json|All files (*.*)|*.*" };
        if (dialog.ShowDialog() != true) return;
        try
        {
            File.WriteAllText(dialog.FileName, System.Text.Json.JsonSerializer.Serialize(_data, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
            Info($"Backup berhasil disimpan ke:\n{dialog.FileName}", "REMM(i)");
        }
        catch (Exception ex)
        {
            Info($"Backup gagal:\n{ex.Message}", "REMM(i)");
        }
    }

    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var existing = Application.Current.Windows.OfType<SettingsWindow>().FirstOrDefault();
        if (existing is not null) { existing.Activate(); return; }
        var settings = new SettingsWindow(_mascot) { Owner = this };
        settings.Left = Left + Width + 14;
        settings.Top = Top;
        if (settings.Left + settings.Width > SystemParameters.WorkArea.Right)
            settings.Left = Math.Max(SystemParameters.WorkArea.Left, Left - settings.Width - 14);
        settings.Show();
    }

    private void Layout_Click(object sender, RoutedEventArgs e)
    {
        _data.Settings.PanelOpacity = _data.Settings.PanelOpacity > 0.88 ? 0.82 : 0.96;
        try { RemmDataService.Save(_data); } catch (Exception ex) { Info($"Gagal menyimpan tampilan:\n{ex.Message}", "REMM(i)"); }
        Opacity = _data.Settings.PanelOpacity;
    }

    private void Console_Click(object sender, RoutedEventArgs e)
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "remm-data.json");
        Info($"Data tersimpan di:\n{path}\n\nTugas: {_data.Tasks.Count}\nRutinitas: {_data.Routines.Count}\nJadwal: {_data.Schedules.Count}", "REMM(i) Info");
    }

    private void AddCalendar_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama acara:", "", "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(title)) return;
        var dateText = Prompt("Tanggal dan waktu (contoh: 15/09/2026 19:30):", DateTime.Now.AddHours(1).ToString("dd/MM/yyyy HH:mm"), "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(dateText) || !DateTime.TryParse(dateText, out var date)) { Info("Format tanggal tidak valid.", "Calender"); return; }
        _data.Schedules.Add(new RemmSchedule { Title = title.Trim(), DateTime = date });
        RemmDataService.Save(_data); RefreshView();
    }

    private void CalendarDetail_Click(object sender, RoutedEventArgs e)
    {
        var schedules = _data.Schedules.OrderBy(s => s.DateTime).ToList();
        Info(schedules.Count == 0 ? "Belum ada jadwal." : string.Join("\n", schedules.Select(s => $"• {s.Title} — {s.DateTime:dd MMM yyyy HH:mm}")), "Calender — Detail");
    }

    private void AddRoutine_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama rutinitas:", "", "Tambah Rutinitas");
        if (string.IsNullOrWhiteSpace(title)) return;
        _data.Routines.Add(new RemmRoutine { Title = title.Trim() });
        RemmDataService.Save(_data); RefreshView();
    }

    private void AddTask_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama tugas:", "", "Tambah Tugas");
        if (string.IsNullOrWhiteSpace(title)) return;
        var priority = NormalizePriority(Prompt("Prioritas (Tinggi / Sedang / Rendah):", "Sedang", "Tambah Tugas") ?? "Sedang");
        _data.Tasks.Add(new RemmTask { Title = title.Trim(), Priority = priority });
        RemmDataService.Save(_data); RefreshView();
    }

    private void FilterAll_Click(object sender, RoutedEventArgs e) => SetFilter("Semua");
    private void FilterHigh_Click(object sender, RoutedEventArgs e) => SetFilter("Tinggi");
    private void FilterMedium_Click(object sender, RoutedEventArgs e) => SetFilter("Sedang");
    private void FilterLow_Click(object sender, RoutedEventArgs e) => SetFilter("Rendah");
    private void SearchBox_TextChanged(object sender, WpfTextChangedEventArgs e) => RefreshView();
    private void SetFilter(string filter) { _filter = filter; RefreshView(); }

    private void RefreshView()
    {
        if (!IsInitialized) return;
        DisplayNameText.Text = _data.DisplayName;
        CalendarPanel.Children.Clear();
        foreach (var schedule in _data.Schedules.OrderBy(s => s.DateTime).Take(3))
            CalendarPanel.Children.Add(new WpfTextBlock { Text = $"{schedule.Title}    {schedule.DateTime:dd MMM}", Foreground = WpfBrushes.WhiteSmoke, FontSize = 10, FontWeight = WpfFontWeights.SemiBold, Margin = new Thickness(0, 2, 0, 4), TextTrimming = TextTrimming.CharacterEllipsis });
        if (_data.Schedules.Count == 0)
            CalendarPanel.Children.Add(new WpfTextBlock { Text = "Belum ada jadwal.", Foreground = WpfBrushes.Gray, FontStyle = WpfFontStyles.Italic, FontSize = 9 });

        RoutinePanel.Children.Clear();
        var search = SearchBox.Text?.Trim() ?? "";
        foreach (var routine in _data.Routines.Where(r => string.IsNullOrWhiteSpace(search) || r.Title.Contains(search, StringComparison.OrdinalIgnoreCase)))
        {
            var row = new WpfDockPanel { Margin = new Thickness(0, 2, 0, 4) };
            var text = new WpfTextBlock { Text = routine.Title, Foreground = WpfBrushes.WhiteSmoke, FontSize = 10, VerticalAlignment = System.Windows.VerticalAlignment.Center };
            WpfDockPanel.SetDock(text, WpfDock.Left);
            var delete = new WpfButton { Content = "×", Width = 24, Height = 22, Tag = routine.Id, Margin = new Thickness(4, 0, 0, 0) };
            delete.Click += DeleteRoutine_Click; WpfDockPanel.SetDock(delete, WpfDock.Right); row.Children.Add(delete); row.Children.Add(text); RoutinePanel.Children.Add(row);
        }

        TasksPanel.Children.Clear();
        var tasks = _data.Tasks.Where(t => (_filter == "Semua" || t.Priority == _filter) && (string.IsNullOrWhiteSpace(search) || t.Title.Contains(search, StringComparison.OrdinalIgnoreCase))).ToList();
        TaskEmptyText.Visibility = tasks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        foreach (var task in tasks)
        {
            var row = new WpfDockPanel { Margin = new Thickness(0, 1, 0, 4) };
            var check = new WpfCheckBox { IsChecked = task.Completed, Tag = task.Id, VerticalAlignment = System.Windows.VerticalAlignment.Center };
            check.Checked += TaskCheckChanged; check.Unchecked += TaskCheckChanged; WpfDockPanel.SetDock(check, WpfDock.Left);
            var delete = new WpfButton { Content = "×", Width = 24, Height = 22, Tag = task.Id, Margin = new Thickness(4, 0, 0, 0) };
            delete.Click += DeleteTask_Click; WpfDockPanel.SetDock(delete, WpfDock.Right);
            var text = new WpfTextBlock { Text = $"{task.Title}  [{task.Priority}]", Foreground = task.Completed ? WpfBrushes.Gray : WpfBrushes.WhiteSmoke, TextDecorations = task.Completed ? WpfTextDecorations.Strikethrough : null, FontSize = 9, VerticalAlignment = System.Windows.VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
            row.Children.Add(check); row.Children.Add(delete); row.Children.Add(text); TasksPanel.Children.Add(row);
        }
    }

    private void DeleteRoutine_Click(object sender, RoutedEventArgs e) { if (sender is WpfButton b && b.Tag is string id) { _data.Routines.RemoveAll(r => r.Id == id); RemmDataService.Save(_data); RefreshView(); } }
    private void TaskCheckChanged(object sender, RoutedEventArgs e) { if (sender is WpfCheckBox b && b.Tag is string id) { var t = _data.Tasks.FirstOrDefault(x => x.Id == id); if (t != null) { t.Completed = b.IsChecked == true; RemmDataService.Save(_data); RefreshView(); } } }
    private void DeleteTask_Click(object sender, RoutedEventArgs e) { if (sender is WpfButton b && b.Tag is string id) { _data.Tasks.RemoveAll(t => t.Id == id); RemmDataService.Save(_data); RefreshView(); } }

    private static string NormalizePriority(string value) => value.Contains("tinggi", StringComparison.OrdinalIgnoreCase) ? "Tinggi" : value.Contains("rendah", StringComparison.OrdinalIgnoreCase) ? "Rendah" : "Sedang";

    private static string? Prompt(string label, string initial, string title)
    {
        var dialog = new Window { Title = title, Width = 340, Height = 170, WindowStartupLocation = WindowStartupLocation.CenterScreen, ResizeMode = ResizeMode.NoResize, ShowInTaskbar = false, Topmost = true, Background = WpfBrushes.White };
        var grid = new WpfGrid { Margin = new Thickness(14) };
        grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto }); grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto }); grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto });
        var labelBlock = new WpfTextBlock { Text = label, Foreground = WpfBrushes.Black, Margin = new Thickness(0, 0, 0, 8) }; WpfGrid.SetRow(labelBlock, 0);
        var input = new WpfTextBox { Text = initial, Height = 32, Padding = new Thickness(8) }; WpfGrid.SetRow(input, 1);
        var buttons = new WpfStackPanel { Orientation = WpfOrientation.Horizontal, HorizontalAlignment = WpfHorizontalAlignment.Right, Margin = new Thickness(0, 10, 0, 0) };
        var cancel = new WpfButton { Content = "Batal", Width = 70, Margin = new Thickness(4) }; var ok = new WpfButton { Content = "OK", Width = 70, Margin = new Thickness(4) };
        cancel.Click += (_, _) => dialog.DialogResult = false; ok.Click += (_, _) => dialog.DialogResult = true;
        buttons.Children.Add(cancel); buttons.Children.Add(ok); WpfGrid.SetRow(buttons, 2); grid.Children.Add(labelBlock); grid.Children.Add(input); grid.Children.Add(buttons); dialog.Content = grid; dialog.Loaded += (_, _) => input.Focus();
        return dialog.ShowDialog() == true ? input.Text : null;
    }

    private static void Info(string message, string title) => System.Windows.MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);
}
