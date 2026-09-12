using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Win32;

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
            PositionNearMascot();
            RefreshView();
        };
    }

    public void PositionNearMascot()
    {
        var area = _mascot.GetWorkingAreaInDip();
        var centerX = _mascot.Left + (_mascot.Width / 2);
        var centerY = _mascot.Top + (_mascot.Height / 2);
        var placeLeft = centerX >= area.Left + area.Width / 2;
        var x = placeLeft ? area.Left : area.Right - Width;
        var y = Math.Max(area.Top, Math.Min(centerY - Height / 2, area.Bottom - Height));
        Left = x;
        Top = y;
    }

    private void Panel_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left)
            return;

        if (e.OriginalSource is DependencyObject source &&
            (FindParent<ButtonBase>(source) != null || FindParent<TextBox>(source) != null || FindParent<ScrollBar>(source) != null))
            return;

        try
        {
            DragMove();
        }
        catch (InvalidOperationException)
        {
            // Ignore a mouse capture race while closing/opening another window.
        }
    }

    private static T? FindParent<T>(DependencyObject? child) where T : DependencyObject
    {
        var current = child;
        while (current != null)
        {
            if (current is T match)
                return match;
            current = VisualTreeHelper.GetParent(current);
        }
        return null;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();

    private void Download_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog
        {
            FileName = "remm-backup.json",
            Filter = "REMM data (*.json)|*.json|All files (*.*)|*.*"
        };

        if (dialog.ShowDialog() != true)
            return;

        File.WriteAllText(dialog.FileName, System.Text.Json.JsonSerializer.Serialize(_data, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        Info($"Backup berhasil disimpan ke:\n{dialog.FileName}", "REMM(i)");
    }

    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var value = Prompt("Nama yang ditampilkan pada menu:", _data.DisplayName, "Pengaturan");
        if (value == null)
            return;

        _data.DisplayName = value.Trim();
        if (string.IsNullOrWhiteSpace(_data.DisplayName))
            _data.DisplayName = "Maskot Denia";
        RemmDataService.Save(_data);
        Info("Pengaturan tersimpan.", "REMM(i)");
    }

    private void Layout_Click(object sender, RoutedEventArgs e)
    {
        Opacity = Opacity > 0.88 ? 0.82 : 0.96;
        Info($"Opacity menu: {Opacity:0.00}", "Tampilan");
    }

    private void Console_Click(object sender, RoutedEventArgs e)
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "remm-data.json");
        Info($"Data tersimpan di:\n{path}\n\nTugas: {_data.Tasks.Count}\nRutinitas: {_data.Routines.Count}\nJadwal: {_data.Schedules.Count}", "REMM(i) Info");
    }

    private void AddCalendar_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama acara:", "", "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(title))
            return;

        var dateText = Prompt("Tanggal dan waktu (contoh: 15/09/2026 19:30):", DateTime.Now.AddHours(1).ToString("dd/MM/yyyy HH:mm"), "Tambah Kalender");
        if (string.IsNullOrWhiteSpace(dateText) || !DateTime.TryParse(dateText, out var date))
        {
            Info("Format tanggal tidak valid.", "Calender");
            return;
        }

        _data.Schedules.Add(new RemmSchedule { Title = title.Trim(), DateTime = date });
        RemmDataService.Save(_data);
        RefreshView();
    }

    private void CalendarDetail_Click(object sender, RoutedEventArgs e)
    {
        var schedules = _data.Schedules.OrderBy(s => s.DateTime).ToList();
        var text = schedules.Count == 0
            ? "Belum ada jadwal."
            : string.Join("\n", schedules.Select(s => $"• {s.Title} — {s.DateTime:dd MMM yyyy HH:mm}"));
        Info(text, "Calender — Detail");
    }

    private void AddRoutine_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama rutinitas:", "", "Tambah Rutinitas");
        if (string.IsNullOrWhiteSpace(title))
            return;

        _data.Routines.Add(new RemmRoutine { Title = title.Trim() });
        RemmDataService.Save(_data);
        RefreshView();
    }

    private void AddTask_Click(object sender, RoutedEventArgs e)
    {
        var title = Prompt("Nama tugas:", "", "Tambah Tugas");
        if (string.IsNullOrWhiteSpace(title))
            return;

        var priority = Prompt("Prioritas (Tinggi / Sedang / Rendah):", "Sedang", "Tambah Tugas") ?? "Sedang";
        priority = NormalizePriority(priority);

        _data.Tasks.Add(new RemmTask { Title = title.Trim(), Priority = priority });
        RemmDataService.Save(_data);
        RefreshView();
    }

    private void FilterAll_Click(object sender, RoutedEventArgs e) => SetFilter("Semua");
    private void FilterHigh_Click(object sender, RoutedEventArgs e) => SetFilter("Tinggi");
    private void FilterMedium_Click(object sender, RoutedEventArgs e) => SetFilter("Sedang");
    private void FilterLow_Click(object sender, RoutedEventArgs e) => SetFilter("Rendah");

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) => RefreshView();

    private void SetFilter(string filter)
    {
        _filter = filter;
        RefreshView();
    }

    private void RefreshView()
    {
        if (!IsInitialized)
            return;

        CalendarPanel.Children.Clear();
        foreach (var schedule in _data.Schedules.OrderBy(s => s.DateTime).Take(3))
        {
            var row = new TextBlock
            {
                Text = $"{schedule.Title}    {schedule.DateTime:dd MMM}",
                Foreground = Brushes.WhiteSmoke,
                FontSize = 11,
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0, 2, 0, 4),
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            CalendarPanel.Children.Add(row);
        }

        if (_data.Schedules.Count == 0)
            CalendarPanel.Children.Add(new TextBlock { Text = "Belum ada jadwal.", Foreground = Brushes.Gray, FontStyle = FontStyles.Italic, FontSize = 10 });

        RoutinePanel.Children.Clear();
        var search = SearchBox.Text?.Trim() ?? "";
        foreach (var routine in _data.Routines.Where(r => string.IsNullOrWhiteSpace(search) || r.Title.Contains(search, StringComparison.OrdinalIgnoreCase)))
        {
            var row = new DockPanel { Margin = new Thickness(0, 2, 0, 4) };
            var text = new TextBlock { Text = routine.Title, Foreground = Brushes.WhiteSmoke, FontSize = 11, VerticalAlignment = VerticalAlignment.Center };
            DockPanel.SetDock(text, Dock.Left);
            var delete = new Button { Content = "×", Width = 24, Height = 22, Tag = routine.Id, Margin = new Thickness(4, 0, 0, 0) };
            delete.Click += DeleteRoutine_Click;
            DockPanel.SetDock(delete, Dock.Right);
            row.Children.Add(delete);
            row.Children.Add(text);
            RoutinePanel.Children.Add(row);
        }

        TasksPanel.Children.Clear();
        var tasks = _data.Tasks.Where(t => (_filter == "Semua" || t.Priority == _filter) &&
                                           (string.IsNullOrWhiteSpace(search) || t.Title.Contains(search, StringComparison.OrdinalIgnoreCase))).ToList();
        TaskEmptyText.Visibility = tasks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        foreach (var task in tasks)
        {
            var row = new DockPanel { Margin = new Thickness(0, 1, 0, 4) };
            var check = new CheckBox { IsChecked = task.Completed, Tag = task.Id, VerticalAlignment = VerticalAlignment.Center };
            check.Checked += TaskCheckChanged;
            check.Unchecked += TaskCheckChanged;
            DockPanel.SetDock(check, Dock.Left);

            var delete = new Button { Content = "×", Width = 24, Height = 22, Tag = task.Id, Margin = new Thickness(4, 0, 0, 0) };
            delete.Click += DeleteTask_Click;
            DockPanel.SetDock(delete, Dock.Right);

            var text = new TextBlock
            {
                Text = $"{task.Title}  [{task.Priority}]",
                Foreground = task.Completed ? Brushes.Gray : Brushes.WhiteSmoke,
                TextDecorations = task.Completed ? TextDecorations.Strikethrough : null,
                FontSize = 10,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis
            };

            row.Children.Add(check);
            row.Children.Add(delete);
            row.Children.Add(text);
            TasksPanel.Children.Add(row);
        }
    }

    private void DeleteRoutine_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button button && button.Tag is string id)
        {
            _data.Routines.RemoveAll(r => r.Id == id);
            RemmDataService.Save(_data);
            RefreshView();
        }
    }

    private void TaskCheckChanged(object sender, RoutedEventArgs e)
    {
        if (sender is CheckBox box && box.Tag is string id)
        {
            var task = _data.Tasks.FirstOrDefault(t => t.Id == id);
            if (task != null)
            {
                task.Completed = box.IsChecked == true;
                RemmDataService.Save(_data);
                RefreshView();
            }
        }
    }

    private void DeleteTask_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button button && button.Tag is string id)
        {
            _data.Tasks.RemoveAll(t => t.Id == id);
            RemmDataService.Save(_data);
            RefreshView();
        }
    }

    private static string NormalizePriority(string value)
    {
        if (value.Contains("tinggi", StringComparison.OrdinalIgnoreCase)) return "Tinggi";
        if (value.Contains("rendah", StringComparison.OrdinalIgnoreCase)) return "Rendah";
        return "Sedang";
    }

    private static string? Prompt(string label, string initial, string title)
    {
        var dialog = new Window
        {
            Title = title,
            Width = 340,
            Height = 170,
            WindowStartupLocation = WindowStartupLocation.CenterScreen,
            ResizeMode = ResizeMode.NoResize,
            ShowInTaskbar = false,
            Topmost = true,
            Background = Brushes.White
        };

        var grid = new Grid { Margin = new Thickness(14) };
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        var labelBlock = new TextBlock { Text = label, Foreground = Brushes.Black, Margin = new Thickness(0, 0, 0, 8) };
        Grid.SetRow(labelBlock, 0);
        var input = new TextBox { Text = initial, Height = 32, Padding = new Thickness(8) };
        Grid.SetRow(input, 1);
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 10, 0, 0) };
        var cancel = new Button { Content = "Batal", Width = 70, Margin = new Thickness(4) };
        var ok = new Button { Content = "OK", Width = 70, Margin = new Thickness(4) };
        cancel.Click += (_, _) => dialog.DialogResult = false;
        ok.Click += (_, _) => dialog.DialogResult = true;
        buttons.Children.Add(cancel);
        buttons.Children.Add(ok);
        Grid.SetRow(buttons, 2);

        grid.Children.Add(labelBlock);
        grid.Children.Add(input);
        grid.Children.Add(buttons);
        dialog.Content = grid;
        dialog.Loaded += (_, _) => input.Focus();

        return dialog.ShowDialog() == true ? input.Text : null;
    }

    private static void Info(string message, string title)
        => System.Windows.MessageBox.Show(message, title, MessageBoxButton.OK, MessageBoxImage.Information);
}
