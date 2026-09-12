using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace RemmI;

public sealed class RemmTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Priority { get; set; } = "Sedang";
    public bool Completed { get; set; }
}

public sealed class RemmRoutine
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
}

public sealed class RemmSchedule
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public DateTime DateTime { get; set; } = System.DateTime.Now;
}

public sealed class RemmData
{
    public List<RemmTask> Tasks { get; set; } = new();
    public List<RemmRoutine> Routines { get; set; } = new();
    public List<RemmSchedule> Schedules { get; set; } = new();
    public string DisplayName { get; set; } = "Maskot Denia";
}

public static class RemmDataService
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    private static readonly string Folder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i");
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
            return JsonSerializer.Deserialize<RemmData>(json, Options) ?? CreateDefault();
        }
        catch
        {
            return CreateDefault();
        }
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

    private static RemmData CreateDefault()
    {
        return new RemmData
        {
            Tasks = new List<RemmTask>(),
            Routines = new List<RemmRoutine> { new() { Title = "REMMIE Project" } },
            Schedules = new List<RemmSchedule>
            {
                new() { Title = "Weekly Standup Meeting", DateTime = DateTime.Now.Date.AddDays(1).AddHours(9) },
                new() { Title = "Daily Farming & Daily Routine", DateTime = DateTime.Now.Date.AddDays(2).AddHours(18) }
            }
        };
    }
}
