using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using WpfApplication = System.Windows.Application;
using WpfMessageBox = System.Windows.MessageBox;
using WpfMessageBoxButton = System.Windows.MessageBoxButton;
using WpfMessageBoxImage = System.Windows.MessageBoxImage;

namespace RemmI;

public partial class TaskWindow : Window
{
    private readonly MainWindow _mascot;
    private RemmData _data;
    private string _filter = "Semua";
    private bool _webReady;

    public TaskWindow(MainWindow mascot)
    {
        InitializeComponent();
        Topmost = false;
        _mascot = mascot;
        _data = RemmDataService.Load();

        Loaded += async (_, _) =>
        {
            ApplySettings(_data.Settings);
            PositionNearMascot();
            await InitializeWebViewAsync();
        };
    }

    public void ApplySettings(RemmSettings settings)
    {
        if (settings is null) return;
        Opacity = Math.Clamp(settings.PanelOpacity, 0.65, 1.0);
        if (_webReady)
            _ = WebView.ExecuteScriptAsync($"window.setPanelOpacity?.({Opacity.ToString(System.Globalization.CultureInfo.InvariantCulture)});");
    }

    private async System.Threading.Tasks.Task InitializeWebViewAsync()
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        WebView.CoreWebView2.Settings.IsZoomControlEnabled = false;
        WebView.CoreWebView2.WebMessageReceived += WebMessageReceived;

        var root = Path.Combine(AppContext.BaseDirectory, "WebUI");
        WebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "remmie.local", root, CoreWebView2HostResourceAccessKind.Allow);

        _webReady = true;
        WebView.CoreWebView2.Navigate("https://remmie.local/index.html");
    }

    private void WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var action = root.GetProperty("action").GetString();

            switch (action)
            {
                case "close": Close(); break;
                case "settings": Settings_Click(); break;
                case "console": ShowConsole(); break;
                case "calendar":
                case "calendar-detail": OpenCalendarWindow(); break;
                case "add-calendar": OpenEntry(EntryKind.Schedule); break;
                case "routine": OpenRoutineWindow(_data.Routines.FirstOrDefault()?.Id); break;
                case "add-routine": OpenEntry(EntryKind.Routine); break;
                case "add-task": OpenEntry(EntryKind.Task); break;
                case "filter":
                    _filter = root.GetProperty("value").GetString() ?? "Semua";
                    RefreshView();
                    break;
                case "search": RefreshView(); break;
                case "open-routine": OpenRoutineWindow(root.GetProperty("id").GetString()); break;
                case "share-routine": ShareRoutine(root.GetProperty("id").GetString()); break;
                case "delete-routine": DeleteRoutine(root.GetProperty("id").GetString()); break;
                case "toggle-task":
                    ToggleTask(root.GetProperty("id").GetString(), root.GetProperty("completed").GetBoolean());
                    break;
                case "delete-task": DeleteTask(root.GetProperty("id").GetString()); break;
            }
        }
        catch { }
    }

    private async void RefreshView()
    {
        _data = RemmDataService.Load();
        if (!_webReady) return;

        var model = new
        {
            displayName = _data.DisplayName,
            taskCount = _data.Tasks.Count(t => !t.Completed),
            schedules = _data.Schedules.OrderBy(s => s.DateTime).Take(3).Select(s => new { title = s.Title, date = s.DateTime.ToString("dd MMM") }),
            routines = _data.Routines.Select(r => new { id = r.Id, title = r.Title }),
            tasks = _data.Tasks
                .Where(t => _filter == "Semua" || t.Priority == _filter)
                .Select(t => new
                {
                    id = t.Id, title = t.Title, priority = t.Priority, completed = t.Completed,
                    deadline = t.Deadline.HasValue ? t.Deadline.Value.ToString("dd MMM") : ""
                })
        };

        var json = JsonSerializer.Serialize(model);
        await WebView.ExecuteScriptAsync($"window.renderData?.({JsonSerializer.Serialize(json)});");
    }

    private void Settings_Click()
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

    private void ShowConsole()
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "remm-data.json");
        WpfMessageBox.Show($"Data tersimpan di:\n{path}\n\nTugas: {_data.Tasks.Count}\nRutinitas: {_data.Routines.Count}\nJadwal: {_data.Schedules.Count}",
            "REMM(i) Info", WpfMessageBoxButton.OK, WpfMessageBoxImage.Information);
    }

    private void OpenCalendarWindow()
    {
        var window = new CalendarWindow(this, _data) { Owner = this };
        window.Left = Left - window.Width - 12;
        window.Top = Math.Max(SystemParameters.WorkArea.Top, Top);
        if (window.Left < SystemParameters.WorkArea.Left)
            window.Left = Math.Min(SystemParameters.WorkArea.Right - window.Width, Left + Width + 12);
        window.Show();
    }

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

    private void OpenRoutineWindow(string? routineId)
    {
        if (string.IsNullOrWhiteSpace(routineId)) return;
        var window = new RoutineWindow(this, _data, routineId);
        window.Left = Left - window.Width - 12;
        window.Top = Math.Max(SystemParameters.WorkArea.Top, Top);
        if (window.Left < SystemParameters.WorkArea.Left)
            window.Left = Math.Min(SystemParameters.WorkArea.Right - window.Width, Left + Width + 12);
        window.Show();
    }

    private void ShareRoutine(string? id)
    {
        var routine = _data.Routines.FirstOrDefault(r => r.Id == id);
        if (routine is null) return;
        try { Clipboard.SetText(routine.Title); } catch { }
    }

    private void DeleteRoutine(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return;
        _data.Routines.RemoveAll(r => r.Id == id);
        RemmDataService.Save(_data);
        RefreshView();
    }

    private void ToggleTask(string? id, bool completed)
    {
        var task = _data.Tasks.FirstOrDefault(t => t.Id == id);
        if (task is null) return;
        task.Completed = completed;
        RemmDataService.Save(_data);
        RefreshView();
    }

    private void DeleteTask(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return;
        _data.Tasks.RemoveAll(t => t.Id == id);
        RemmDataService.Save(_data);
        RefreshView();
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

    protected override void OnClosed(EventArgs e)
    {
        if (_webReady && WebView.CoreWebView2 is not null)
            WebView.CoreWebView2.WebMessageReceived -= WebMessageReceived;
        base.OnClosed(e);
    }
}
