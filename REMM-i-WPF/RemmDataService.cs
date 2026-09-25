using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace RemmI;

public sealed class RemmTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Priority { get; set; } = "Sedang";
    public bool Completed { get; set; }
    public DateTime? Deadline { get; set; }
    public string Notes { get; set; } = "";
}

public sealed class RemmRoutine
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public DateTime CreatedDate { get; set; } = DateTime.Today;
    public string Notes { get; set; } = "";
}

public sealed class RemmSchedule
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public DateTime DateTime { get; set; } = DateTime.Now;
}

public sealed class RemmSettings
{
    public string Theme { get; set; } = "Soft Sakura Pink";
    public string PanelMode { get; set; } = "Mode Bar";
    public string MascotMode { get; set; } = "Bar";
    public double PanelOpacity { get; set; } = 0.95;
    public string PanelBackground { get; set; } = "#21181E";
    public string PanelBorder { get; set; } = "#F39BB8";
    public bool AutoSnap { get; set; } = true;
    public int PeekVisiblePercent { get; set; } = 50;
    public bool DragEnabled { get; set; } = true;
    public bool NotificationsEnabled { get; set; } = true;
    public bool NotificationSoundEnabled { get; set; } = true;
    public int NotificationLeadMinutes { get; set; } = 5;
    public int NotificationVolume { get; set; } = 75;
    public string NotificationSound { get; set; } = "Synth Chime (Web Audio)";
    public string IntegrationUrl { get; set; } = "";
    public string IntegrationToken { get; set; } = "";
    public string GoogleApiKey { get; set; } = "";
    public string GoogleCalendarId { get; set; } = "primary";
    public string IdleImagePath { get; set; } = "";
    public string PeekImagePath { get; set; } = "";
    public string PointingImagePath { get; set; } = "";
    public string AlertImagePath { get; set; } = "";
    public double PanelLeft { get; set; } = double.NaN;
    public double PanelTop { get; set; } = double.NaN;
    public bool RememberPanelPosition { get; set; } = true;
    public int PanelLayoutVersion { get; set; } = 0;
}

public sealed class RemmData
{
    public List<RemmTask> Tasks { get; set; } = new();
    public List<RemmRoutine> Routines { get; set; } = new();
    public List<RemmSchedule> Schedules { get; set; } = new();
    public string ProjectName { get; set; } = "REMM(i)E";
    public string DisplayName { get; set; } = "Maskot Denia";
    public RemmSettings Settings { get; set; } = new();
}

public static class RemmDataService
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    private static readonly string Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i");
    private static readonly string FilePath = Path.Combine(Folder, "remm-data.json");

    public static RemmData Load()
    {
        try
        {
            if (!File.Exists(FilePath))
            {
                var data = CreateDefault();
                Save(data);
                return data;
            }
            var json = File.ReadAllText(FilePath);
            var dataLoaded = JsonSerializer.Deserialize<RemmData>(json, Options) ?? CreateDefault();
            dataLoaded.Settings ??= new RemmSettings();
            dataLoaded.Tasks ??= new List<RemmTask>();
            dataLoaded.Routines ??= new List<RemmRoutine>();
            dataLoaded.Schedules ??= new List<RemmSchedule>();
            return dataLoaded;
        }
        catch { return CreateDefault(); }
    }

    public static void Save(RemmData data)
    {
        Directory.CreateDirectory(Folder);
        File.WriteAllText(FilePath, JsonSerializer.Serialize(data, Options));
    }

    public static string ExportBackup(RemmData data)
    {
        Directory.CreateDirectory(Folder);
        var backup = Path.Combine(Folder, $"remm-backup-{DateTime.Now:yyyyMMdd-HHmmss}.json");
        File.WriteAllText(backup, JsonSerializer.Serialize(data, Options));
        return backup;
    }

    public static void ImportBackup(string path)
    {
        var json = File.ReadAllText(path);
        var data = JsonSerializer.Deserialize<RemmData>(json, Options) ?? throw new InvalidDataException("File backup REMM tidak valid.");
        data.Settings ??= new RemmSettings();
        data.Tasks ??= new List<RemmTask>();
        data.Routines ??= new List<RemmRoutine>();
        data.Schedules ??= new List<RemmSchedule>();
        Save(data);
    }

    private static RemmData CreateDefault() => new()
    {
        Tasks = new List<RemmTask>(),
        Routines = new List<RemmRoutine> { new() { Title = "REMMIE Project", CreatedDate = DateTime.Today } },
        Schedules = new List<RemmSchedule>
        {
            new() { Title = "Weekly Standup Meeting", DateTime = DateTime.Now.Date.AddDays(1).AddHours(9) },
            new() { Title = "Daily Farming & Daily Routine", DateTime = DateTime.Now.Date.AddDays(2).AddHours(18) }
        },
        Settings = new RemmSettings()
    };
}
