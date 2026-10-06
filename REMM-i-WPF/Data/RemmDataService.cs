using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using RemmI.Models;

namespace RemmI.Data;

public static class RemmDataService
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
    };

    private static string Folder
    {
        get
        {
            var overrideFolder = Environment.GetEnvironmentVariable("REMMI_DATA_DIRECTORY");
            return string.IsNullOrWhiteSpace(overrideFolder)
                ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i")
                : Path.GetFullPath(overrideFolder);
        }
    }

    public static string DataFilePath => Path.Combine(Folder, "remm-data.json");

    public static RemmData Load()
    {
        try
        {
            if (!File.Exists(DataFilePath))
            {
                var defaultData = CreateDefault();
                Save(defaultData);
                return defaultData;
            }

            var json = File.ReadAllText(DataFilePath);
            var data = JsonSerializer.Deserialize<RemmData>(json, Options) ?? CreateDefault();
            Normalize(data);
            return data;
        }
        catch (Exception ex)
        {
            Trace.TraceError($"Could not load REMM(i) data from '{DataFilePath}': {ex}");
            return CreateDefault();
        }
    }

    public static void Save(RemmData data)
    {
        ArgumentNullException.ThrowIfNull(data);
        Normalize(data);
        Directory.CreateDirectory(Folder);
        var tempPath = Path.Combine(Folder, $".remm-data-{Guid.NewGuid():N}.tmp");
        try
        {
            File.WriteAllText(tempPath, JsonSerializer.Serialize(data, Options));
            File.Move(tempPath, DataFilePath, true);
        }
        finally
        {
            if (File.Exists(tempPath))
                File.Delete(tempPath);
        }
    }

    public static void ExportBackup(RemmData data, string path)
    {
        ArgumentNullException.ThrowIfNull(data);
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        var fullPath = Path.GetFullPath(path);
        var directory = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);
        File.WriteAllText(fullPath, JsonSerializer.Serialize(data, Options));
    }

    public static void ImportBackup(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        var json = File.ReadAllText(path);
        var data = JsonSerializer.Deserialize<RemmData>(json, Options)
            ?? throw new InvalidDataException("File backup REMM(i)E tidak valid.");
        Normalize(data);
        Save(data);
    }

    private static void Normalize(RemmData data)
    {
        data.Tasks ??= new List<RemmTask>();
        data.Routines ??= new List<RemmRoutine>();
        data.Schedules ??= new List<RemmSchedule>();
        data.Settings ??= new RemmSettings();
        data.ProjectName ??= "REMM(i)E";
        data.DisplayName ??= "Maskot Denia";
    }

    private static RemmData CreateDefault() => new()
    {
        Tasks = new List<RemmTask>(),
        Routines = new List<RemmRoutine>(),
        Schedules = new List<RemmSchedule>(),
        Settings = new RemmSettings()
    };
}
