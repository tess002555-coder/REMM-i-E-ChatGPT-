using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfButton = System.Windows.Controls.Button;
using WpfCheckBox = System.Windows.Controls.CheckBox;
using WpfComboBox = System.Windows.Controls.ComboBox;
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
            ApplySettings(_data.Settings);
            PositionNearMascot();
            RefreshView();
        };
    }

    public void ApplySettings(RemmSettings settings)
    {
        if (settings is null) return;
        Opacity = Math.Clamp(settings.PanelOpacity, 0.65, 1.0);
        PanelRoot.Background = ToBrush(settings.PanelBackground, "#15181D");
        PanelRoot.BorderBrush = ToBrush(settings.PanelBorder, "#22D3EE");
    }

    private static Brush ToBrush(string value, string fallback)
    {
        try
        {
            var converted = new BrushConverter().ConvertFromString(value);
            if (converted is Brush brush) return brush;
        }
        catch { }
        return (Brush)new BrushConverter().ConvertFromString(fallback)!;
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
        if (e.ChangedButton != System.Windows.Input.MouseButton.Left) return;
        if (IsInteractiveSource(e.OriginalSource as DependencyObject)) return;
        try { DragMove(); e.Handled = true; } catch (InvalidOperationException) { }
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

    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var existing = Application.Current.Windows.OfType<SettingsWindow>().FirstOrDefault();
        if (existing is not null) { existing.Activate(); return; }
        var settings = new SettingsWindow(_mascot) { Owner = this };
        settings.Left = Left + Width + 12;
        settings.Top = Math.Max(SystemParameters.WorkArea.Top, Top);
        if (settings.Left + settings.Width > SystemParameters.WorkArea.Right)
            settings.Left = Math.Max(SystemParameters.WorkArea.Left, Left - settings.Width - 12);
        settings.Show();
    }

    private void Console_Click(object sender, RoutedEventArgs e)
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "remm-data.json");
        Info($"Data tersimpan di:\n{path}\n\nTugas: {_data.Tasks.Count}\nRutinitas: {_data.Routines.Count}\nJadwal: {_data.Schedules.Count}", "REMM(i) Info");
    }

    private void AddCalendar_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama acara", "", "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(title)) return;
        var dateText = Prompt("Tanggal & waktu (contoh: 15/09/2026 19:30)", DateTime.Now.AddHours(1).ToString("dd/MM/yyyy HH:mm"), "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(dateText)) return;
        if (!DateTime.TryParse(dateText, out var date)) { Info("Format tanggal tidak valid.", "Calender"); return; }
        _data.Schedules.Add(new RemmSchedule { Title = title.Trim(), DateTime = date });
        SaveAndRefresh();
    }

    private void CalendarDetail_Click(object sender, RoutedEventArgs e)
    {
        var schedules = _data.Schedules.OrderBy(s => s.DateTime).ToList();
        Info(schedules.Count == 0 ? "Belum ada jadwal." : string.Join("\n", schedules.Select(s => $"• {s.Title} — {s.DateTime:dd MMM yyyy HH:mm}")), "Calender — Detail");
    }

    private void AddRoutine_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama rutinitas", "", "Tambah Rutinitas");
        if (string.IsNullOrWhiteSpace(title)) return;
        _data.Routines.Add(new RemmRoutine { Title = title.Trim() });
        SaveAndRefresh();
    }

    private void AddTask_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama tugas", "", "Tambah Tugas");
        if (string.IsNullOrWhiteSpace(title)) return;
        var priority = NormalizePriority(Prompt("Prioritas: Tinggi / Sedang / Rendah", "Sedang", "Tambah Tugas") ?? "Sedang");
        _data.Tasks.Add(new RemmTask { Title = title.Trim(), Priority = priority });
        SaveAndRefresh();
    }

    private void FilterAll_Click(object sender, RoutedEventArgs e) => SetFilter("Semua");
    private void FilterHigh_Click(object sender, RoutedEventArgs e) => SetFilter("Tinggi");
    private void FilterMedium_Click(object sender, RoutedEventArgs e) => SetFilter("Sedang");
    private void FilterLow_Click(object sender, RoutedEventArgs e) => SetFilter("Rendah");
    private void SearchBox_TextChanged(object sender, WpfTextChangedEventArgs e) => RefreshView();

    private void SetFilter(string filter)
    {
        _filter = filter;
        FilterAllButton.Background = filter == "Semua" ? ToBrush("#22D3EE", "#22D3EE") : ToBrush("#20242A", "#20242A");
        FilterAllButton.Foreground = filter == "Semua" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterHighButton.Background = filter == "Tinggi" ? ToBrush("#22D3EE", "#22D3EE") : ToBrush("#20242A", "#20242A");
        FilterHighButton.Foreground = filter == "Tinggi" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterMediumButton.Background = filter == "Sedang" ? ToBrush("#22D3EE", "#22D3EE") : ToBrush("#20242A", "#20242A");
        FilterMediumButton.Foreground = filter == "Sedang" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterLowButton.Background = filter == "Rendah" ? ToBrush("#22D3EE", "#22D3EE") : ToBrush("#20242A", "#20242A");
        FilterLowButton.Foreground = filter == "Rendah" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        RefreshView();
    }

    private void RefreshView()
    {
        if (!IsInitialized) return;
        DisplayNameText.Text = _data.DisplayName;
        TaskCountText.Text = _data.Tasks.Count(t => !t.Completed).ToString();

        CalendarPanel.Children.Clear();
        foreach (var schedule in _data.Schedules.OrderBy(s => s.DateTime).Take(3))
        {
            var row = new WpfGrid { Margin = new Thickness(0, 2, 0, 5) };
            row.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = new System.Windows.GridLength(1, System.Windows.GridUnitType.Star) });
            row.ColumnDefinitions.Add(new System.Windows.Controls.ColumnDefinition { Width = System.Windows.GridLength.Auto });
            var title = new WpfTextBlock { Text = schedule.Title, Foreground = WpfBrushes.WhiteSmoke, FontSize = 9.5, FontWeight = WpfFontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis, VerticalAlignment = VerticalAlignment.Center };
            var date = new WpfTextBlock { Text = schedule.DateTime.ToString("dd MMM"), Foreground = ToBrush("#22D3EE", "#22D3EE"), FontSize = 9, FontWeight = WpfFontWeights.Bold, Margin = new Thickness(7, 0, 0, 0) };
            WpfGrid.SetColumn(date, 1); row.Children.Add(title); row.Children.Add(date); CalendarPanel.Children.Add(row);
        }
        if (_data.Schedules.Count == 0)
            CalendarPanel.Children.Add(new WpfTextBlock { Text = "Belum ada jadwal.", Foreground = WpfBrushes.Gray, FontStyle = WpfFontStyles.Italic, FontSize = 9 });

        RoutinePanel.Children.Clear();
        var search = SearchBox.Text?.Trim() ?? "";
        foreach (var routine in _data.Routines.Where(r => string.IsNullOrWhiteSpace(search) || r.Title.Contains(search, StringComparison.OrdinalIgnoreCase)))
        {
            var row = new WpfDockPanel { Margin = new Thickness(0, 2, 0, 3) };
            var text = new WpfTextBlock { Text = routine.Title, Foreground = WpfBrushes.WhiteSmoke, FontSize = 9.5, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
            WpfDockPanel.SetDock(text, WpfDock.Left);
            var delete = new WpfButton { Content = "×", Width = 23, Height = 21, Tag = routine.Id, Margin = new Thickness(5, 0, 0, 0), ToolTip = "Hapus rutinitas" };
            delete.Click += DeleteRoutine_Click; WpfDockPanel.SetDock(delete, WpfDock.Right); row.Children.Add(delete); row.Children.Add(text); RoutinePanel.Children.Add(row);
        }
        if (RoutinePanel.Children.Count == 0)
            RoutinePanel.Children.Add(new WpfTextBlock { Text = "Belum ada rutinitas.", Foreground = WpfBrushes.Gray, FontStyle = WpfFontStyles.Italic, FontSize = 9 });

        TasksPanel.Children.Clear();
        var tasks = _data.Tasks.Where(t => (_filter == "Semua" || t.Priority == _filter) && (string.IsNullOrWhiteSpace(search) || t.Title.Contains(search, StringComparison.OrdinalIgnoreCase))).ToList();
        TaskEmptyText.Visibility = tasks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        foreach (var task in tasks)
        {
            var row = new WpfDockPanel { Margin = new Thickness(0, 1, 0, 4) };
            var check = new WpfCheckBox { IsChecked = task.Completed, Tag = task.Id, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 5, 0) };
            check.Checked += TaskCheckChanged; check.Unchecked += TaskCheckChanged; WpfDockPanel.SetDock(check, WpfDock.Left);
            var delete = new WpfButton { Content = "×", Width = 23, Height = 21, Tag = task.Id, Margin = new Thickness(5, 0, 0, 0), ToolTip = "Hapus tugas" };
            delete.Click += DeleteTask_Click; WpfDockPanel.SetDock(delete, WpfDock.Right);
            var text = new WpfTextBlock { Text = $"{task.Title}  ·  {task.Priority}", Foreground = task.Completed ? WpfBrushes.Gray : WpfBrushes.WhiteSmoke, TextDecorations = task.Completed ? WpfTextDecorations.Strikethrough : null, FontSize = 9, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
            row.Children.Add(check); row.Children.Add(delete); row.Children.Add(text); TasksPanel.Children.Add(row);
        }
    }

    private void DeleteRoutine_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton b && b.Tag is string id) { _data.Routines.RemoveAll(r => r.Id == id); SaveAndRefresh(); }
    }

    private void TaskCheckChanged(object sender, RoutedEventArgs e)
    {
        if (sender is WpfCheckBox b && b.Tag is string id)
        {
            var task = _data.Tasks.FirstOrDefault(x => x.Id == id);
            if (task is null) return;
            task.Completed = b.IsChecked == true;
            SaveAndRefresh();
        }
    }

    private void DeleteTask_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton b && b.Tag is string id) { _data.Tasks.RemoveAll(t => t.Id == id); SaveAndRefresh(); }
    }

    private void SaveAndRefresh()
    {
        try
        {
            RemmDataService.Save(_data);
            RefreshView();
        }
        catch (Exception ex)
        {
            Info($"Data tidak dapat disimpan:\n{ex.Message}", "REMM(i)");
        }
    }

    private static string NormalizePriority(string value) => value.Contains("tinggi", StringComparison.OrdinalIgnoreCase) ? "Tinggi" : value.Contains("rendah", StringComparison.OrdinalIgnoreCase) ? "Rendah" : "Sedang";

    private static string? Prompt(string label, string initial, string title)
    {
        var dialog = new Window
        {
            Title = title, Width = 360, Height = 185, WindowStartupLocation = WindowStartupLocation.CenterScreen,
            ResizeMode = ResizeMode.NoResize, ShowInTaskbar = false, Topmost = true, Background = ToBrush("#171A1F", "#171A1F")
        };
        var grid = new WpfGrid { Margin = new Thickness(16) };
        grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new WpfRowDefinition { Height = GridLength.Auto });
        var labelBlock = new WpfTextBlock { Text = label, Foreground = WpfBrushes.WhiteSmoke, FontSize = 11, Margin = new Thickness(0, 0, 0, 9) }; WpfGrid.SetRow(labelBlock, 0);
        var input = new WpfTextBox { Text = initial, Height = 34, Padding = new Thickness(8), Background = ToBrush("#101216", "#101216"), Foreground = WpfBrushes.WhiteSmoke, BorderBrush = ToBrush("#343B45", "#343B45") }; WpfGrid.SetRow(input, 1);
        var buttons = new WpfStackPanel { Orientation = WpfOrientation.Horizontal, HorizontalAlignment = WpfHorizontalAlignment.Right, Margin = new Thickness(0, 12, 0, 0) };
        var cancel = new WpfButton { Content = "Batal", Width = 75, Height = 30, Margin = new Thickness(4), Background = ToBrush("#20242A", "#20242A"), Foreground = WpfBrushes.WhiteSmoke };
        var ok = new WpfButton { Content = "OK", Width = 75, Height = 30, Margin = new Thickness(4), Background = ToBrush("#22D3EE", "#22D3EE"), Foreground = ToBrush("#061015", "#061015"), FontWeight = WpfFontWeights.Bold };
        cancel.Click += (_, _) => dialog.DialogResult = false; ok.Click += (_, _) => dialog.DialogResult = true;
        buttons.Children.Add(cancel); buttons.Children.Add(ok); WpfGrid.SetRow(buttons, 2);
        grid.Children.Add(labelBlock); grid.Children.Add(input); grid.Children.Add(buttons); dialog.Content = grid;
        dialog.Loaded += (_, _) => { input.Focus(); input.SelectAll(); };
        return dialog.ShowDialog() == true ? input.Text : null;
    }

    private static void Info(string message, string title) => System.Windows.MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);
}
