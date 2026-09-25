using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace RemmI;

public partial class TaskWindow : Window
{
    private readonly MainWindow _mascot;
    private RemmData _data;
    private bool _positionRestored;
    private string _filter = "Semua";

    public TaskWindow(MainWindow mascot)
    {
        InitializeComponent();
        _mascot = mascot;
        _data = RemmDataService.Load();

        Loaded += async (_, _) =>
        {
            ApplySettings(_data.Settings);
            RestoreOrPosition();
            await InitializeWebViewAsync();
            RefreshView();
        };

        LocationChanged += (_, _) => SavePanelPosition();
    }

    public void ApplySettings(RemmSettings settings)
    {
        if (settings is null) return;
        Opacity = Math.Clamp(settings.PanelOpacity, 0.65, 1.0);
    }

    private async System.Threading.Tasks.Task InitializeWebViewAsync()
    {
        await PanelWebView.EnsureCoreWebView2Async();

        PanelWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        PanelWebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        PanelWebView.CoreWebView2.Settings.IsZoomControlEnabled = false;
        PanelWebView.CoreWebView2.WebMessageReceived += WebMessageReceived;

        var root = Path.Combine(AppContext.BaseDirectory, "WebUI");
        var index = Path.Combine(root, "index.html");
        if (!File.Exists(index))
        {
            MessageBox.Show($"WebUI tidak ditemukan:\n{index}", "REMM(i)E");
            return;
        }

        PanelWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "remmie.local",
            root,
            CoreWebView2HostResourceAccessKind.Allow);

        PanelWebView.Source = new Uri("https://remmie.local/index.html");
    }

    private void WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var message = e.TryGetWebMessageAsString();

        switch (message)
        {
            case "drag":
                try { DragMove(); } catch (InvalidOperationException) { }
                break;
            case "close":
                SavePanelPosition();
                Close();
                break;
            case "settings":
                Settings_Click(this, new RoutedEventArgs());
                break;
            case "calendar":
                OpenCalendarWindow();
                break;
            case "routine":
                OpenRoutineFromWeb();
                break;
            case "add-calendar":
                OpenEntry(EntryKind.Schedule);
                break;
            case "add-routine":
                OpenEntry(EntryKind.Routine);
                break;
            case "add-task":
                OpenEntry(EntryKind.Task);
                break;
        }
    }

    private void OpenRoutineFromWeb()
    {
        var routine = _data.Routines.FirstOrDefault();
        if (routine is not null)
            OpenRoutineWindow(routine.Id);
    }

    private void RestoreOrPosition()
    {
        if (_data.Settings.RememberPanelPosition &&
            !double.IsNaN(_data.Settings.PanelLeft) &&
            !double.IsNaN(_data.Settings.PanelTop))
        {
            var area = _mascot.GetWorkingAreaInDip();
            Left = Math.Max(area.Left, Math.Min(_data.Settings.PanelLeft, area.Right - Width));
            Top = Math.Max(area.Top, Math.Min(_data.Settings.PanelTop, area.Bottom - Height));
            _positionRestored = true;
            return;
        }

        PositionNearMascot();
    }

    public void PositionNearMascot()
    {
        var area = _mascot.GetWorkingAreaInDip();
        var mascotLeft = _mascot.Left;
        var mascotRight = _mascot.Left + _mascot.Width;
        var mascotCenterX = mascotLeft + (_mascot.Width / 2);
        var placeLeft = mascotCenterX >= area.Left + area.Width / 2;
        const double gap = 18;

        var x = placeLeft
            ? mascotLeft - Width - gap
            : mascotRight + gap;

        var y = _mascot.Top + 10;

        Left = Math.Max(area.Left, Math.Min(x, area.Right - Width));
        Top = Math.Max(area.Top, Math.Min(y, area.Bottom - Height));
        _positionRestored = true;
        SavePanelPosition();
    }

    private void SavePanelPosition()
    {
        if (!_positionRestored || !IsLoaded ||
            !_data.Settings.RememberPanelPosition ||
            double.IsNaN(Left) || double.IsNaN(Top))
            return;

        _data.Settings.PanelLeft = Left;
        _data.Settings.PanelTop = Top;

        try { RemmDataService.Save(_data); } catch { }
    }

    private void Settings_Click(object sender, RoutedEventArgs e)
    {
        var existing = Application.Current.Windows.OfType<SettingsWindow>().FirstOrDefault();
        if (existing is not null)
        {
            existing.Activate();
            return;
        }

        var settings = new SettingsWindow(_mascot) { Owner = this };
        settings.Left = Left + Width + 12;
        settings.Top = Math.Max(SystemParameters.WorkArea.Top, Top);

        if (settings.Left + settings.Width > SystemParameters.WorkArea.Right)
            settings.Left = Math.Max(SystemParameters.WorkArea.Left, Left - settings.Width - 12);

        settings.Show();
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

    private void OpenRoutineWindow(string routineId)
    {
        var window = new RoutineWindow(this, _data, routineId);
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

    public void RefreshView()
    {
        if (!IsLoaded || PanelWebView.CoreWebView2 is null)
            return;

        _data = RemmDataService.Load();

        var payload = new
        {
            displayName = _data.DisplayName,
            schedules = _data.Schedules
                .OrderBy(s => s.DateTime)
                .Take(4)
                .Select(s => new
                {
                    title = s.Title,
                    date = s.DateTime.ToString("dd MMM"),
                    time = s.DateTime.ToString("HH:mm")
                }),
            routines = _data.Routines
                .Take(4)
                .Select(r => new { id = r.Id, title = r.Title }),
            tasks = _data.Tasks
                .Where(t => _filter == "Semua" || t.Priority == _filter)
                .Take(6)
                .Select(t => new
                {
                    id = t.Id,
                    title = t.Title,
                    priority = t.Priority,
                    completed = t.Completed,
                    deadline = t.Deadline.HasValue ? t.Deadline.Value.ToString("dd MMM") : ""
                }),
            taskCount = _data.Tasks.Count(t => !t.Completed),
            filter = _filter
        };

        var json = JsonSerializer.Serialize(payload);
        var script = $"window.remmie && window.remmieUpdate({JsonSerializer.Serialize(json)});";
        _ = PanelWebView.CoreWebView2.ExecuteScriptAsync(script);
    }

    protected override void OnClosed(EventArgs e)
    {
        SavePanelPosition();
        if (PanelWebView.CoreWebView2 is not null)
            PanelWebView.CoreWebView2.WebMessageReceived -= WebMessageReceived;
        base.OnClosed(e);
    }
}
