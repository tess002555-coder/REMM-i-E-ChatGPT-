using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using WpfApplication = System.Windows.Application;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfButton = System.Windows.Controls.Button;
using WpfCheckBox = System.Windows.Controls.CheckBox;
using WpfComboBox = System.Windows.Controls.ComboBox;
using WpfDock = System.Windows.Controls.Dock;
using WpfDockPanel = System.Windows.Controls.DockPanel;
using WpfFontStyles = System.Windows.FontStyles;
using WpfFontWeights = System.Windows.FontWeights;
using WpfGrid = System.Windows.Controls.Grid;
using WpfMessageBox = System.Windows.MessageBox;
using WpfMessageBoxButton = System.Windows.MessageBoxButton;
using WpfMessageBoxImage = System.Windows.MessageBoxImage;
using WpfTextBlock = System.Windows.Controls.TextBlock;
using WpfTextBox = System.Windows.Controls.TextBox;
using WpfTextChangedEventArgs = System.Windows.Controls.TextChangedEventArgs;
using WpfTextDecorations = System.Windows.TextDecorations;
using WpfSlider = System.Windows.Controls.Slider;
using WpfScrollBar = System.Windows.Controls.Primitives.ScrollBar;

namespace RemmI;

public partial class TaskWindow : Window
{
    private readonly MainWindow _mascot;
    private RemmData _data;
    private string _filter = "Semua";

    public TaskWindow(MainWindow mascot)
    {
        InitializeComponent();
        Topmost = false;
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
        var y = mascotCenterY - Height / 2;
        Left = Math.Max(area.Left, Math.Min(x, area.Right - Width));
        Top = Math.Max(area.Top, Math.Min(y, area.Bottom - Height));
    }

    private void Panel_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ChangedButton != MouseButton.Left) return;
        if (IsInteractiveSource(e.OriginalSource as DependencyObject)) return;
        try { DragMove(); e.Handled = true; } catch (InvalidOperationException) { }
    }

    private static bool IsInteractiveSource(DependencyObject? source)
    {
        var current = source;
        while (current is not null)
        {
            if (current is WpfButton || current is WpfTextBox || current is WpfCheckBox || current is WpfSlider || current is WpfComboBox || current is WpfScrollBar)
                return true;
            if (current is Border border && (border.Name == "CalendarCard" || border.Name == "RoutineCard" || border.Name == "TaskCard"))
                return true;
            current = VisualTreeHelper.GetParent(current);
        }
        return false;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();

    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var existing = WpfApplication.Current.Windows.OfType<SettingsWindow>().FirstOrDefault();
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
        WpfMessageBox.Show($"Data tersimpan di:\n{path}\n\nTugas: {_data.Tasks.Count}\nRutinitas: {_data.Routines.Count}\nJadwal: {_data.Schedules.Count}", "REMM(i) Info", WpfMessageBoxButton.OK, WpfMessageBoxImage.Information);
    }

    private void CalendarCard_Click(object sender, MouseButtonEventArgs e) => OpenCalendarWindow();
    private void CalendarDetail_Click(object sender, RoutedEventArgs e) => OpenCalendarWindow();

    private void OpenCalendarWindow()
    {
        var window = new CalendarWindow(this, _data) { Owner = this };
        window.Left = Left - window.Width - 12;
        window.Top = Math.Max(SystemParameters.WorkArea.Top, Top);
        if (window.Left < SystemParameters.WorkArea.Left)
            window.Left = Math.Min(SystemParameters.WorkArea.Right - window.Width, Left + Width + 12);
        window.Show();
    }

    private void AddCalendar_Click(object sender, RoutedEventArgs e) => OpenEntry(EntryKind.Schedule);

    private void RoutineCard_Click(object sender, MouseButtonEventArgs e)
    {
        if (e.OriginalSource is WpfButton) return;
        var routine = _data.Routines.FirstOrDefault();
        if (routine is not null) OpenRoutineWindow(routine.Id);
    }

    private void OpenRoutineWindow(string routineId)
    {
        var window = new RoutineWindow(this, _data, routineId);
        window.Left = Left - window.Width - 12;
        window.Top = Math.Max(SystemParameters.WorkArea.Top, Top);
        if (window.Left < SystemParameters.WorkArea.Left)
            window.Left = Math.Min(SystemParameters.WorkArea.Right - window.Width, Left + Width + 12);
        window.Show();
    }

    private void AddRoutine_Click(object sender, RoutedEventArgs e) => OpenEntry(EntryKind.Routine);
    private void AddTask_Click(object sender, RoutedEventArgs e) => OpenEntry(EntryKind.Task);

    private void OpenEntry(EntryKind kind)
    {
        var dialog = new EntryDialogWindow(_data, kind) { Owner = this };
        dialog.Saved += (_, _) =>
        {
            _data = RemmDataService.Load();
            RefreshView();
        };
        dialog.ShowDialog();
    }

    private void FilterAll_Click(object sender, RoutedEventArgs e) => SetFilter("Semua");
    private void FilterHigh_Click(object sender, RoutedEventArgs e) => SetFilter("Tinggi");
    private void FilterMedium_Click(object sender, RoutedEventArgs e) => SetFilter("Sedang");
    private void FilterLow_Click(object sender, RoutedEventArgs e) => SetFilter("Rendah");

    private void SearchBox_TextChanged(object sender, WpfTextChangedEventArgs e)
    {
        SearchPlaceholder.Visibility = string.IsNullOrWhiteSpace(SearchBox.Text)
            ? Visibility.Visible
            : Visibility.Collapsed;
        RefreshView();
    }

    private void SetFilter(string filter)
    {
        _filter = filter;
        FilterAllButton.Background = filter == "Semua" ? ToBrush("#19CBE8", "#19CBE8") : ToBrush("#20242A", "#20242A");
        FilterAllButton.Foreground = filter == "Semua" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterHighButton.Background = filter == "Tinggi" ? ToBrush("#19CBE8", "#19CBE8") : ToBrush("#20242A", "#20242A");
        FilterHighButton.Foreground = filter == "Tinggi" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterMediumButton.Background = filter == "Sedang" ? ToBrush("#19CBE8", "#19CBE8") : ToBrush("#20242A", "#20242A");
        FilterMediumButton.Foreground = filter == "Sedang" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        FilterLowButton.Background = filter == "Rendah" ? ToBrush("#19CBE8", "#19CBE8") : ToBrush("#20242A", "#20242A");
        FilterLowButton.Foreground = filter == "Rendah" ? ToBrush("#061015", "#061015") : ToBrush("#C8D2DA", "#C8D2DA");
        RefreshView();
    }

    public void RefreshView()
    {
        if (!IsInitialized) return;
        _data = RemmDataService.Load();
        DisplayNameText.Text = _data.DisplayName;
        TaskCountText.Text = _data.Tasks.Count(t => !t.Completed).ToString();

        CalendarPanel.Children.Clear();
        foreach (var schedule in _data.Schedules.OrderBy(s => s.DateTime).Take(3))
        {
            var row = new WpfGrid { Margin = new Thickness(0, 2, 0, 4) };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var title = new WpfTextBlock
            {
                Text = schedule.Title,
                Foreground = ToBrush("#E4E9ED", "#E4E9ED"),
                FontSize = 8.5,
                FontWeight = WpfFontWeights.Normal,
                TextTrimming = TextTrimming.CharacterEllipsis,
                VerticalAlignment = VerticalAlignment.Center
            };

            var date = new WpfTextBlock
            {
                Text = schedule.DateTime.ToString("dd MMM"),
                Foreground = ToBrush("#19CBE8", "#19CBE8"),
                FontSize = 8.5,
                FontWeight = WpfFontWeights.SemiBold,
                Margin = new Thickness(7, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            Grid.SetColumn(date, 1);
            row.Children.Add(title);
            row.Children.Add(date);
            CalendarPanel.Children.Add(row);
        }

        if (_data.Schedules.Count == 0)
            CalendarPanel.Children.Add(new WpfTextBlock
            {
                Text = "Belum ada jadwal.",
                Foreground = ToBrush("#687481", "#687481"),
                FontStyle = WpfFontStyles.Italic,
                FontSize = 8
            });

        RoutinePanel.Children.Clear();
        var search = SearchBox.Text?.Trim() ?? "";

        foreach (var routine in _data.Routines.Where(r =>
                     string.IsNullOrWhiteSpace(search) ||
                     r.Title.Contains(search, StringComparison.OrdinalIgnoreCase)))
        {
            var row = new WpfDockPanel
            {
                Margin = new Thickness(0, 1, 0, 2),
                Tag = routine.Id,
                Cursor = Cursors.Hand,
                LastChildFill = true
            };
            row.MouseLeftButtonUp += RoutineRow_Click;

            var actions = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            var share = new WpfButton
            {
                Content = "↗",
                Style = (Style)FindResource("ActionButton"),
                ToolTip = "Bagikan rutinitas",
                Tag = routine.Id
            };
            share.Click += ShareRoutine_Click;

            var open = new WpfButton
            {
                Content = "›",
                Style = (Style)FindResource("ActionButton"),
                ToolTip = "Buka rutinitas",
                Tag = routine.Id
            };
            open.Click += OpenRoutineAction_Click;

            var delete = new WpfButton
            {
                Content = "×",
                Style = (Style)FindResource("ActionButton"),
                Foreground = ToBrush("#AEB9C2", "#AEB9C2"),
                ToolTip = "Hapus rutinitas",
                Tag = routine.Id
            };
            delete.Click += DeleteRoutine_Click;

            actions.Children.Add(share);
            actions.Children.Add(open);
            actions.Children.Add(delete);
            WpfDockPanel.SetDock(actions, WpfDock.Right);

            var icon = new WpfTextBlock
            {
                Text = "▣",
                Foreground = ToBrush("#00D2D3", "#00D2D3"),
                FontSize = 8,
                Margin = new Thickness(0, 0, 6, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            var text = new WpfTextBlock
            {
                Text = routine.Title,
                Foreground = ToBrush("#E4E9ED", "#E4E9ED"),
                FontSize = 8.5,
                FontWeight = WpfFontWeights.Normal,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis
            };

            var textWrap = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };
            textWrap.Children.Add(icon);
            textWrap.Children.Add(text);

            row.Children.Add(actions);
            row.Children.Add(textWrap);
            RoutinePanel.Children.Add(row);
        }

        if (RoutinePanel.Children.Count == 0)
            RoutinePanel.Children.Add(new WpfTextBlock
            {
                Text = "Belum ada rutinitas.",
                Foreground = ToBrush("#687481", "#687481"),
                FontStyle = WpfFontStyles.Italic,
                FontSize = 8
            });

        TasksPanel.Children.Clear();
        var tasks = _data.Tasks
            .Where(t =>
                (_filter == "Semua" || t.Priority == _filter) &&
                (string.IsNullOrWhiteSpace(search) ||
                 t.Title.Contains(search, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        TaskEmptyText.Visibility = tasks.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        foreach (var task in tasks)
        {
            var row = new WpfDockPanel
            {
                Margin = new Thickness(0, 1, 0, 4),
                Tag = task.Id
            };

            var check = new WpfCheckBox
            {
                IsChecked = task.Completed,
                Tag = task.Id,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 5, 0)
            };
            check.Checked += TaskCheckChanged;
            check.Unchecked += TaskCheckChanged;
            WpfDockPanel.SetDock(check, WpfDock.Left);

            var delete = new WpfButton
            {
                Content = "×",
                Width = 21,
                Height = 21,
                Tag = task.Id,
                Margin = new Thickness(5, 0, 0, 0),
                ToolTip = "Hapus tugas",
                Style = (Style)FindResource("ActionButton")
            };
            delete.Click += DeleteTask_Click;
            WpfDockPanel.SetDock(delete, WpfDock.Right);

            var deadline = task.Deadline.HasValue ? $" · {task.Deadline.Value:dd MMM}" : "";
            var text = new WpfTextBlock
            {
                Text = $"{task.Title}  ·  {task.Priority}{deadline}",
                Foreground = task.Completed ? ToBrush("#687481", "#687481") : ToBrush("#E4E9ED", "#E4E9ED"),
                TextDecorations = task.Completed ? WpfTextDecorations.Strikethrough : null,
                FontSize = 8.5,
                FontWeight = WpfFontWeights.Normal,
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis
            };

            row.Children.Add(check);
            row.Children.Add(delete);
            row.Children.Add(text);
            TasksPanel.Children.Add(row);
        }
    }

    private void RoutineRow_Click(object sender, MouseButtonEventArgs e)
    {
        if (sender is WpfDockPanel row && row.Tag is string id && e.OriginalSource is not WpfButton)
            OpenRoutineWindow(id);
    }

    private void OpenRoutineAction_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton button && button.Tag is string id)
            OpenRoutineWindow(id);
    }

    private void ShareRoutine_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton button && button.Tag is string id)
        {
            var routine = _data.Routines.FirstOrDefault(r => r.Id == id);
            if (routine is null) return;

            try
            {
                Clipboard.SetText(routine.Title);
                button.ToolTip = "Nama rutinitas disalin";
            }
            catch
            {
                button.ToolTip = "Tidak dapat menyalin";
            }
        }
    }

    private void DeleteRoutine_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton b && b.Tag is string id)
        {
            _data.Routines.RemoveAll(r => r.Id == id);
            RemmDataService.Save(_data);
            RefreshView();
        }
    }

    private void TaskCheckChanged(object sender, RoutedEventArgs e)
    {
        if (sender is WpfCheckBox b && b.Tag is string id)
        {
            var task = _data.Tasks.FirstOrDefault(x => x.Id == id);
            if (task is null) return;
            task.Completed = b.IsChecked == true;
            RemmDataService.Save(_data);
            RefreshView();
        }
    }

    private void DeleteTask_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton b && b.Tag is string id)
        {
            _data.Tasks.RemoveAll(t => t.Id == id);
            RemmDataService.Save(_data);
            RefreshView();
        }
    }
}
