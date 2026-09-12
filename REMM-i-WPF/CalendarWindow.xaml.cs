using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfFontStyles = System.Windows.FontStyles;
using WpfFontWeights = System.Windows.FontWeights;
using WpfMessageBox = System.Windows.MessageBox;
using WpfMessageBoxButton = System.Windows.MessageBoxButton;

namespace RemmI;

public partial class CalendarWindow : Window
{
    private readonly RemmData _data;
    private readonly Window _ownerWindow;
    private DateTime _month = new(DateTime.Today.Year, DateTime.Today.Month, 1);

    public CalendarWindow(Window owner, RemmData data)
    {
        InitializeComponent();
        _ownerWindow = owner;
        _data = data;
        Loaded += (_, _) => Refresh();
    }

    public void Refresh()
    {
        MonthText.Text = _month.ToString("MMMM yyyy", CultureInfo.GetCultureInfo("id-ID"));
        DayHeaders.Children.Clear();
        foreach (var name in new[] { "Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb" })
            DayHeaders.Children.Add(new TextBlock { Text = name, Foreground = WpfBrushes.Gray, FontSize = 8, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 2, 0, 2) });

        CalendarGrid.Children.Clear();
        var first = (int)_month.DayOfWeek;
        var days = DateTime.DaysInMonth(_month.Year, _month.Month);
        for (var i = 0; i < first; i++) CalendarGrid.Children.Add(new Border { Height = 31 });
        for (var day = 1; day <= days; day++)
        {
            var date = new DateTime(_month.Year, _month.Month, day);
            var count = _data.Schedules.Count(s => s.DateTime.Date == date.Date);
            var button = new Button { Content = count > 0 ? $"{day}\n•" : day.ToString(), Height = 31, Margin = new Thickness(2), FontSize = 8, Foreground = date.Date == DateTime.Today ? WpfBrushes.White : WpfBrushes.LightGray, Background = count > 0 ? Brush("#12343B") : Brush("#20242A"), BorderBrush = date.Date == DateTime.Today ? Brush("#22D3EE") : Brush("#303742"), BorderThickness = new Thickness(1), Tag = date };
            button.Click += Day_Click;
            CalendarGrid.Children.Add(button);
        }
        RefreshEvents();
    }

    private void RefreshEvents()
    {
        EventList.Children.Clear();
        var events = _data.Schedules.OrderBy(s => s.DateTime).ToList();
        foreach (var item in events)
        {
            var card = new Border { Background = Brush("#20242A"), BorderBrush = Brush("#343C47"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(10), Padding = new Thickness(8), Margin = new Thickness(0, 0, 0, 6) };
            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition());
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.Children.Add(new TextBlock { Text = item.Title, Foreground = WpfBrushes.WhiteSmoke, FontSize = 9.5, FontWeight = WpfFontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis });
            var right = new StackPanel { Orientation = Orientation.Horizontal };
            right.Children.Add(new TextBlock { Text = item.DateTime.ToString("dd MMM  •  HH:mm"), Foreground = Brush("#22D3EE"), FontSize = 8.5, VerticalAlignment = VerticalAlignment.Center });
            var del = new Button { Content = "×", Width = 22, Height = 22, Margin = new Thickness(6, 0, 0, 0), Tag = item.Id, Background = Brush("#2A2024"), Foreground = Brush("#FCA5A5"), BorderBrush = Brush("#53323A") };
            del.Click += Delete_Click;
            right.Children.Add(del); Grid.SetColumn(right, 1); grid.Children.Add(right); card.Child = grid; EventList.Children.Add(card);
        }
        if (events.Count == 0) EventList.Children.Add(new TextBlock { Text = "Belum ada acara.", Foreground = WpfBrushes.Gray, FontStyle = WpfFontStyles.Italic, FontSize = 9, Margin = new Thickness(4) });
    }

    private static System.Windows.Media.Brush Brush(string hex) => (System.Windows.Media.Brush)new System.Windows.Media.BrushConverter().ConvertFromString(hex)!;
    private void Prev_Click(object sender, RoutedEventArgs e) { _month = _month.AddMonths(-1); Refresh(); }
    private void Next_Click(object sender, RoutedEventArgs e) { _month = _month.AddMonths(1); Refresh(); }
    private void Day_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button b && b.Tag is DateTime date)
        {
            var items = _data.Schedules.Where(s => s.DateTime.Date == date.Date).OrderBy(s => s.DateTime).ToList();
            WpfMessageBox.Show(items.Count == 0 ? $"Tidak ada acara pada {date:dd/MM/yyyy}." : string.Join("\n", items.Select(x => $"• {x.Title} — {x.DateTime:HH:mm}")), $"Kalender {date:dd/MM/yyyy}", WpfMessageBoxButton.OK);
        }
    }
    private void Add_Click(object sender, RoutedEventArgs e) { var dialog = new EntryDialogWindow(_data, EntryKind.Schedule) { Owner = this }; dialog.Saved += (_, _) => Refresh(); dialog.ShowDialog(); }
    private void Delete_Click(object sender, RoutedEventArgs e) { if (sender is Button b && b.Tag is string id) { _data.Schedules.RemoveAll(x => x.Id == id); RemmDataService.Save(_data); Refresh(); } }
    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}
