using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Windows;
using Microsoft.Win32;
using RemmI.Data;
using RemmI.Models;
using CoreWebView2WebMessageReceivedEventArgs = Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs;

namespace RemmI;

public partial class PanelWindow : Window
{
    private static readonly string[] AllowedThemes =
    {
        "Soft Sakura Pink",
        "Cyberpunk Neon",
        "Clean Milk White",
        "Minimal Obsidian",
        "Emerald Forest"
    };
    private static readonly JsonSerializerOptions WebJsonOptions = new()
    {
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
    };

    private readonly IMascotHost _mascot;
    private RemmData _data;
    private bool _restoringPosition;
    private bool _positionReady;
    private bool _dragging;
    private double _dragStartLeft;
    private double _dragStartTop;
    private string _searchQuery = "";
    private string _taskPriorityFilter = "Semua";

    public PanelWindow(IMascotHost mascot)
    {
        InitializeComponent();
        _mascot = mascot;
        _data = RemmDataService.Load();
        Loaded += PanelWindow_Loaded;
        LocationChanged += (_, _) =>
        {
            if (!_restoringPosition && _positionReady && !_dragging)
                SavePanelPosition();
        };
        Closing += (_, _) => SavePanelPosition();
    }

    private async void PanelWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            _data = RemmDataService.Load();
            ApplySettings(_data.Settings);
            _restoringPosition = true;
            RestoreOrPosition();
            _restoringPosition = false;
            _positionReady = true;
            await WebViewHostService.InitializeAsync(Browser, "panel", OnBrowserMessage);
            SavePanelPosition();
        }
        catch (Exception ex)
        {
            _restoringPosition = false;
            System.Diagnostics.Trace.TraceError($"Could not initialize REMM(i) panel WebView: {ex}");
            MessageBox.Show(
                $"REMM(i)E tidak dapat menyiapkan panel.\n\n{ex.Message}\n\nPastikan WebView2 Runtime terpasang dan folder WebUI tersedia.",
                "REMM(i)E",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    public void ApplySettings(RemmSettings settings)
    {
        if (settings is null)
            return;
        Opacity = Math.Clamp(settings.PanelOpacity, 0.65, 1.0);
        Topmost = settings.AlwaysOnTop;
        if (_positionReady && settings.RememberPanelPosition
            && double.IsFinite(settings.PanelLeft) && double.IsFinite(settings.PanelTop))
        {
            var area = _mascot.GetWorkingAreaInDip();
            Left = Math.Max(area.Left, Math.Min(settings.PanelLeft, area.Right - Width));
            Top = Math.Max(area.Top, Math.Min(settings.PanelTop, area.Bottom - Height));
        }
    }

    private void RestoreOrPosition()
    {
        var area = _mascot.GetWorkingAreaInDip();
        if (_data.Settings.RememberPanelPosition
            && double.IsFinite(_data.Settings.PanelLeft)
            && double.IsFinite(_data.Settings.PanelTop))
        {
            Left = Math.Max(area.Left, Math.Min(_data.Settings.PanelLeft, area.Right - Width));
            Top = Math.Max(area.Top, Math.Min(_data.Settings.PanelTop, area.Bottom - Height));
            return;
        }
        PositionNearMascot(area);
    }

    private void PositionNearMascot(System.Windows.Rect area)
    {
        var mascotLeft = _mascot.Left;
        var mascotRight = _mascot.Left + _mascot.Width;
        var center = mascotLeft + _mascot.Width / 2;
        var placeLeft = center >= area.Left + area.Width / 2;
        const double gap = 24;
        var x = placeLeft ? mascotLeft - Width - gap : mascotRight + gap;
        var y = _mascot.Top + 20;
        Left = Math.Max(area.Left, Math.Min(x, area.Right - Width));
        Top = Math.Max(area.Top, Math.Min(y, area.Bottom - Height));
    }

    private void SavePanelPosition()
    {
        if (!_positionReady || !double.IsFinite(Left) || !double.IsFinite(Top))
            return;
        try
        {
            var data = RemmDataService.Load();
            if (!data.Settings.RememberPanelPosition)
                return;
            data.Settings.PanelLeft = Left;
            data.Settings.PanelTop = Top;
            RemmDataService.Save(data);
            _data.Settings = data.Settings;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceError($"Could not save REMM(i) panel position: {ex}");
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
                case "panel.drag.start":
                    _dragging = true;
                    _dragStartLeft = Left;
                    _dragStartTop = Top;
                    break;
                case "panel.drag.move":
                    if (_dragging)
                    {
                        Left = _dragStartLeft + GetNumber(root, "dx");
                        Top = _dragStartTop + GetNumber(root, "dy");
                    }
                    break;
                case "panel.drag.end":
                    _dragging = false;
                    SavePanelPosition();
                    break;
                case "search.update":
                    UpdateSearch(root);
                    break;
                case "task.create":
                    CreateOrUpdateTask(root, false);
                    break;
                case "task.update":
                    CreateOrUpdateTask(root, true);
                    break;
                case "task.toggle":
                    ToggleTask(root);
                    break;
                case "task.delete":
                    DeleteTask(root);
                    break;
                case "routine.create":
                    CreateOrUpdateRoutine(root, false);
                    break;
                case "routine.update":
                    CreateOrUpdateRoutine(root, true);
                    break;
                case "routine.delete":
                    DeleteRoutine(root);
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
                case "settings.save":
                    SaveSettings(root);
                    break;
                case "mascot.pose.upload":
                    SaveMascotPose(root);
                    break;
                case "backup.export":
                    ExportBackup();
                    break;
                case "backup.import":
                    ImportBackup();
                    break;
                case "app.exit":
                    ExitApplication();
                    break;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceError($"REMM(i) panel action failed: {ex}");
            SendToast(ex.Message, "error");
        }
    }

    private void CreateOrUpdateTask(JsonElement root, bool update)
    {
        var title = RequiredText(root, "title", "Nama tugas");
        var notes = LimitedText(root, "notes", 1000);
        var priority = GetString(root, "priority");
        if (priority is not ("Tinggi" or "Sedang" or "Rendah"))
            priority = "Sedang";
        DateTime? deadline = null;
        var deadlineText = GetString(root, "deadline");
        if (!string.IsNullOrWhiteSpace(deadlineText))
        {
            if (!DateTime.TryParse(deadlineText, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed))
                throw new InvalidOperationException("Tanggal tenggat tugas tidak valid.");
            deadline = parsed;
        }

        if (update)
        {
            var task = _data.Tasks.FirstOrDefault(item => item.Id == GetString(root, "id"))
                ?? throw new InvalidOperationException("Tugas yang akan diubah tidak ditemukan.");
            task.Title = title;
            task.Notes = notes;
            task.Priority = priority;
            task.Deadline = deadline;
            task.UpdatedAt = DateTime.Now;
        }
        else
        {
            var now = DateTime.Now;
            _data.Tasks.Add(new RemmTask { Title = title, Notes = notes, Priority = priority, Deadline = deadline, CreatedAt = now, UpdatedAt = now });
        }
        PersistContentChanges();
        SendSnapshot();
        SendToast(update ? "Tugas diperbarui." : "Tugas ditambahkan.", "success");
    }

    private void ToggleTask(JsonElement root)
    {
        var task = _data.Tasks.FirstOrDefault(item => item.Id == GetString(root, "id"))
            ?? throw new InvalidOperationException("Tugas tidak ditemukan.");
        task.Completed = root.TryGetProperty("completed", out var completed) && completed.ValueKind == JsonValueKind.True;
        task.UpdatedAt = DateTime.Now;
        PersistContentChanges();
        SendSnapshot();
    }

    private void DeleteTask(JsonElement root)
    {
        var removed = _data.Tasks.RemoveAll(item => item.Id == GetString(root, "id"));
        if (removed == 0)
            throw new InvalidOperationException("Tugas tidak ditemukan.");
        PersistContentChanges();
        SendSnapshot();
        SendToast("Tugas dihapus.", "success");
    }

    private void CreateOrUpdateRoutine(JsonElement root, bool update)
    {
        var title = RequiredText(root, "title", "Nama rutinitas");
        var notes = LimitedText(root, "notes", 1000);
        var schedule = LimitedText(root, "schedule", 120);
        var isActive = GetBoolean(root, "isActive", true);
        if (update)
        {
            var routine = _data.Routines.FirstOrDefault(item => item.Id == GetString(root, "id"))
                ?? throw new InvalidOperationException("Rutinitas yang akan diubah tidak ditemukan.");
            routine.Title = title;
            routine.Notes = notes;
            routine.Schedule = schedule;
            routine.IsActive = isActive;
        }
        else
        {
            _data.Routines.Add(new RemmRoutine { Title = title, Notes = notes, Schedule = schedule, IsActive = isActive, CreatedDate = DateTime.Today });
        }
        PersistContentChanges();
        SendSnapshot();
        SendToast(update ? "Rutinitas diperbarui." : "Rutinitas ditambahkan.", "success");
    }

    private void DeleteRoutine(JsonElement root)
    {
        var removed = _data.Routines.RemoveAll(item => item.Id == GetString(root, "id"));
        if (removed == 0)
            throw new InvalidOperationException("Rutinitas tidak ditemukan.");
        PersistContentChanges();
        SendSnapshot();
        SendToast("Rutinitas dihapus.", "success");
    }

    private void CreateOrUpdateSchedule(JsonElement root, bool update)
    {
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
        PersistContentChanges();
        SendSnapshot();
        SendToast(update ? "Jadwal diperbarui." : "Jadwal ditambahkan.", "success");
    }

    private void DeleteSchedule(JsonElement root)
    {
        var removed = _data.Schedules.RemoveAll(item => item.Id == GetString(root, "id"));
        if (removed == 0)
            throw new InvalidOperationException("Jadwal tidak ditemukan.");
        PersistContentChanges();
        SendSnapshot();
        SendToast("Jadwal dihapus.", "success");
    }

    private void SaveSettings(JsonElement root)
    {
        _data = RemmDataService.Load();
        var settings = root.TryGetProperty("settings", out var settingsElement) ? settingsElement : default;
        if (settings.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("Pengaturan tidak valid.");

        var projectName = LimitedText(root, "projectName", 48).Trim();
        var displayName = LimitedText(root, "displayName", 48).Trim();
        if (!string.IsNullOrWhiteSpace(projectName))
            _data.ProjectName = projectName;
        if (!string.IsNullOrWhiteSpace(displayName))
            _data.DisplayName = displayName;

        var theme = GetString(settings, "Theme");
        if (AllowedThemes.Contains(theme, StringComparer.Ordinal))
            _data.Settings.Theme = theme;
        var background = GetString(settings, "PanelBackground");
        var border = GetString(settings, "PanelBorder");
        if (IsHexColor(background))
            _data.Settings.PanelBackground = background;
        if (IsHexColor(border))
            _data.Settings.PanelBorder = border;

        _data.Settings.PanelOpacity = Math.Clamp(GetNumber(settings, "PanelOpacity", 0.95), 0.65, 1.0);
        _data.Settings.DragEnabled = GetBoolean(settings, "DragEnabled", true);
        _data.Settings.AutoSnap = GetBoolean(settings, "AutoSnap", true);
        _data.Settings.AlwaysOnTop = GetBoolean(settings, "AlwaysOnTop", true);
        _data.Settings.RememberPanelPosition = GetBoolean(settings, "RememberPanelPosition", true);
        _data.Settings.RememberMascotPosition = GetBoolean(settings, "RememberMascotPosition", true);
        _data.Settings.NotificationsEnabled = GetBoolean(settings, "NotificationsEnabled", true);
        _data.Settings.NotificationSoundEnabled = GetBoolean(settings, "NotificationSoundEnabled", true);
        _data.Settings.NotificationLeadMinutes = Math.Clamp(GetInteger(settings, "NotificationLeadMinutes", 5), 0, 1440);
        _data.Settings.NotificationVolume = Math.Clamp(GetInteger(settings, "NotificationVolume", 75), 0, 100);

        RemmDataService.Save(_data);
        ApplySettings(_data.Settings);
        _mascot.ApplySettings(_data.Settings);
        SendSnapshot();
        SendToast("Pengaturan disimpan.", "success");
    }

    private void SaveMascotPose(JsonElement root)
    {
        var mode = GetString(root, "mode").ToLowerInvariant();
        var dataUrl = GetString(root, "dataUrl");
        if (mode is not ("peek" or "idle" or "pointing" or "alert"))
            throw new InvalidOperationException("Jenis pose mascot tidak valid.");

        const string pngPrefix = "data:image/png;base64,";
        const string jpegPrefix = "data:image/jpeg;base64,";
        string mime;
        string extension;
        string encoded;
        if (dataUrl.StartsWith(pngPrefix, StringComparison.OrdinalIgnoreCase))
        {
            mime = "image/png";
            extension = ".png";
            encoded = dataUrl[pngPrefix.Length..];
        }
        else if (dataUrl.StartsWith(jpegPrefix, StringComparison.OrdinalIgnoreCase))
        {
            mime = "image/jpeg";
            extension = ".jpg";
            encoded = dataUrl[jpegPrefix.Length..];
        }
        else
        {
            throw new InvalidOperationException("Pilih file PNG atau JPEG.");
        }

        byte[] bytes;
        try { bytes = Convert.FromBase64String(encoded); }
        catch (FormatException) { throw new InvalidOperationException("File gambar tidak valid."); }
        if (bytes.Length == 0 || bytes.Length > 5 * 1024 * 1024 || !HasValidImageHeader(bytes, mime))
            throw new InvalidOperationException("Gambar harus berupa PNG atau JPEG yang valid dan berukuran maksimal 5 MB.");

        var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "poses");
        Directory.CreateDirectory(folder);
        var path = Path.Combine(folder, mode + extension);
        var tempPath = path + ".tmp";
        try
        {
            File.WriteAllBytes(tempPath, bytes);
            File.Move(tempPath, path, true);
        }
        finally
        {
            if (File.Exists(tempPath))
                File.Delete(tempPath);
        }

        _data = RemmDataService.Load();
        switch (mode)
        {
            case "peek": _data.Settings.PeekImagePath = path; break;
            case "idle": _data.Settings.IdleImagePath = path; break;
            case "pointing": _data.Settings.PointingImagePath = path; break;
            case "alert": _data.Settings.AlertImagePath = path; break;
        }
        RemmDataService.Save(_data);
        _mascot.ApplySettings(_data.Settings);
        _mascot.RefreshPose();
        SendSnapshot();
        SendToast("Gambar pose disimpan.", "success");
    }

    private static bool HasValidImageHeader(byte[] bytes, string mime)
    {
        if (mime == "image/png")
            return bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A;
        return bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
    }

    private void ExportBackup()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Ekspor backup REMM(i)E",
            Filter = "JSON backup (*.json)|*.json",
            DefaultExt = ".json",
            AddExtension = true,
            FileName = $"remm-backup-{DateTime.Now:yyyyMMdd-HHmmss}.json"
        };
        if (dialog.ShowDialog(this) != true)
            return;
        RemmDataService.ExportBackup(RemmDataService.Load(), dialog.FileName);
        SendToast("Backup berhasil diekspor.", "success");
    }

    private void ImportBackup()
    {
        var dialog = new OpenFileDialog
        {
            Title = "Pulihkan backup REMM(i)E",
            Filter = "JSON backup (*.json)|*.json",
            CheckFileExists = true,
            Multiselect = false
        };
        if (dialog.ShowDialog(this) != true)
            return;
        if (MessageBox.Show(
                "Memulihkan backup akan mengganti tugas, rutinitas, jadwal, dan pengaturan lokal saat ini. Lanjutkan?",
                "Pulihkan backup",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning) != MessageBoxResult.Yes)
            return;

        RemmDataService.ImportBackup(dialog.FileName);
        _data = RemmDataService.Load();
        ApplySettings(_data.Settings);
        _mascot.ApplySettings(_data.Settings);
        SendSnapshot();
        SendToast("Backup berhasil dipulihkan.", "success");
    }

    private void ExitApplication()
    {
        if (MessageBox.Show("Keluar dari REMM(i)E?", "Keluar", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
            Application.Current.Shutdown();
    }

    private void PersistContentChanges()
    {
        var latest = RemmDataService.Load();
        latest.Tasks = _data.Tasks;
        latest.Routines = _data.Routines;
        latest.Schedules = _data.Schedules;
        latest.ProjectName = _data.ProjectName;
        latest.DisplayName = _data.DisplayName;
        _data = latest;
        RemmDataService.Save(_data);
    }

    private void SendSnapshot()
    {
        if (Browser.CoreWebView2 is null)
            return;
        _data = RemmDataService.Load();
        var query = _searchQuery.Trim();
        var filteredTasks = _data.Tasks.Where(task =>
            (_taskPriorityFilter == "Semua" || task.Priority == _taskPriorityFilter)
            && MatchesSearch(task.Title, task.Notes, query)).ToList();
        var filteredRoutines = _data.Routines.Where(item => MatchesSearch(item.Title, $"{item.Schedule} {item.Notes}", query)).ToList();
        var filteredSchedules = _data.Schedules.Where(item => MatchesSearch(item.Title, item.Notes, query)).ToList();
        var payload = JsonSerializer.Serialize(new
        {
            type = "snapshot",
            data = _data,
            filteredTasks,
            filteredRoutines,
            filteredSchedules
        }, WebJsonOptions);
        Browser.CoreWebView2.PostWebMessageAsJson(payload);
    }

    private void UpdateSearch(JsonElement root)
    {
        _searchQuery = GetString(root, "query").Trim();
        if (_searchQuery.Length > 120)
            _searchQuery = _searchQuery[..120];
        var filter = GetString(root, "priority");
        _taskPriorityFilter = filter is "Tinggi" or "Sedang" or "Rendah" ? filter : "Semua";
        SendSnapshot();
    }

    private static bool MatchesSearch(string title, string notes, string query) =>
        string.IsNullOrWhiteSpace(query)
        || title.Contains(query, StringComparison.OrdinalIgnoreCase)
        || notes.Contains(query, StringComparison.OrdinalIgnoreCase);

    private void SendToast(string text, string kind)
    {
        if (Browser.CoreWebView2 is null)
            return;
        Browser.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "toast", message = text, kind }));
    }

    private static string RequiredText(JsonElement root, string name, string label)
    {
        var value = GetString(root, name).Trim();
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"{label} wajib diisi.");
        if (value.Length > 180)
            throw new InvalidOperationException($"{label} maksimal 180 karakter.");
        return value;
    }

    private static string LimitedText(JsonElement root, string name, int maxLength)
    {
        var value = GetString(root, name);
        if (value.Length > maxLength)
            throw new InvalidOperationException($"Teks terlalu panjang (maksimal {maxLength} karakter).");
        return value;
    }

    private static string GetString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? ""
            : "";

    private static double GetNumber(JsonElement root, string name, double fallback = 0) =>
        root.TryGetProperty(name, out var value) && value.TryGetDouble(out var result) && double.IsFinite(result)
            ? result
            : fallback;

    private static int GetInteger(JsonElement root, string name, int fallback) =>
        root.TryGetProperty(name, out var value) && value.TryGetInt32(out var result) ? result : fallback;

    private static bool GetBoolean(JsonElement root, string name, bool fallback) =>
        root.TryGetProperty(name, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean()
            : fallback;

    private static bool IsHexColor(string value) =>
        value.Length == 7 && value[0] == '#'
        && value.AsSpan(1).ToString().All(Uri.IsHexDigit);
}
