using System;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Windows;
using RemmI.Data;
using RemmI.Models;
using CoreWebView2WebMessageReceivedEventArgs = Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs;

namespace RemmI;

public partial class CalendarWindow : Window
{
    private static readonly JsonSerializerOptions WebJsonOptions = new()
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
    };

    private RemmData _data;

    public CalendarWindow()
    {
        InitializeComponent();
        _data = RemmDataService.Load();
        Loaded += CalendarWindow_Loaded;
    }

    private async void CalendarWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            _data = RemmDataService.Load();
            Opacity = Math.Clamp(_data.Settings.PanelOpacity, 0.65, 1.0);
            Topmost = _data.Settings.AlwaysOnTop;
            await WebViewHostService.InitializeAsync(Browser, "calendar", OnBrowserMessage);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceError($"Could not initialize REMM(i) calendar WebView: {ex}");
            MessageBox.Show(
                $"REMM(i)E tidak dapat menyiapkan kalender.\n\n{ex.Message}\n\nPastikan WebView2 Runtime terpasang dan folder WebUI tersedia.",
                "REMM(i)E",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    private void OnBrowserMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!WebViewHostService.IsTrustedSource(e.Source))
            return;

        try
        {
            using var message = JsonDocument.Parse(e.WebMessageAsJson);
            if (!message.RootElement.TryGetProperty("type", out var typeElement))
                return;
            var root = message.RootElement;
            switch (typeElement.GetString())
            {
                case "panel.ready":
                    SendSnapshot();
                    break;
                case "panel.close":
                    Close();
                    break;
                case "calendar.close":
                    Close();
                    break;
                case "schedule.create":
                    CreateOrUpdateSchedule(root, false);
                    break;
                case "schedule.update":
                    CreateOrUpdateSchedule(root, true);
                    break;
                case "schedule.delete":
                    DeleteSchedule(root);
                    break;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceError($"REMM(i) calendar action failed: {ex}");
            SendToast(ex.Message, "error");
        }
    }

    private void CreateOrUpdateSchedule(JsonElement root, bool update)
    {
        _data = RemmDataService.Load();
        var title = RequiredText(root, "title", "Nama jadwal");
        var dateText = GetString(root, "dateTime");
        if (!DateTime.TryParse(dateText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dateTime))
            throw new InvalidOperationException("Tanggal dan waktu jadwal tidak valid.");
        var notes = LimitedText(root, "notes", 1000);
        DateTime? endDateTime = null;
        var endText = GetString(root, "endDateTime");
        if (!string.IsNullOrWhiteSpace(endText))
        {
            if (!DateTime.TryParse(endText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsedEnd))
                throw new InvalidOperationException("Waktu selesai jadwal tidak valid.");
            if (parsedEnd < dateTime)
                throw new InvalidOperationException("Waktu selesai tidak boleh mendahului waktu mulai.");
            endDateTime = parsedEnd;
        }

        if (update)
        {
            var schedule = _data.Schedules.FirstOrDefault(item => item.Id == GetString(root, "id"))
                ?? throw new InvalidOperationException("Jadwal yang akan diubah tidak ditemukan.");
            schedule.Title = title;
            schedule.DateTime = dateTime;
            schedule.EndDateTime = endDateTime;
            schedule.Notes = notes;
        }
        else
        {
            _data.Schedules.Add(new RemmSchedule { Title = title, DateTime = dateTime, EndDateTime = endDateTime, Notes = notes });
        }
        RemmDataService.Save(_data);
        SendSnapshot();
        SendToast(update ? "Jadwal diperbarui." : "Jadwal ditambahkan.", "success");
    }

    private void DeleteSchedule(JsonElement root)
    {
        _data = RemmDataService.Load();
        var removed = _data.Schedules.RemoveAll(item => item.Id == GetString(root, "id"));
        if (removed == 0)
            throw new InvalidOperationException("Jadwal tidak ditemukan.");
        RemmDataService.Save(_data);
        SendSnapshot();
        SendToast("Jadwal dihapus.", "success");
    }

    private void SendSnapshot()
    {
        _data = RemmDataService.Load();
        var payload = new
        {
            type = "snapshot",
            data = _data,
            filteredTasks = _data.Tasks,
            filteredRoutines = _data.Routines,
            filteredSchedules = _data.Schedules
        };
        Browser.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(payload, WebJsonOptions));
    }

    private void SendToast(string message, string kind)
    {
        var payload = new { type = "toast", message, kind };
        Browser.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(payload, WebJsonOptions));
    }

    private static string RequiredText(JsonElement root, string name, string label)
    {
        var value = GetString(root, name).Trim();
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"{label} wajib diisi.");
        return value.Length > 180 ? value[..180] : value;
    }

    private static string LimitedText(JsonElement root, string name, int maxLength)
    {
        var value = GetString(root, name);
        if (value.Length > maxLength)
            return value[..maxLength];
        return value;
    }

    private static string GetString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind != JsonValueKind.Null
            ? value.GetString() ?? ""
            : "";
}
