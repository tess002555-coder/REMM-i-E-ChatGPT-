using System;
using System.Collections.Generic;

namespace RemmI.Models;

public sealed class RemmTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public string Priority { get; set; } = "Sedang";
    public bool Completed { get; set; }
    public DateTime? Deadline { get; set; }
    public string Notes { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}

public sealed class RemmRoutine
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public DateTime CreatedDate { get; set; } = DateTime.Today;
    public string Notes { get; set; } = "";
    public string Schedule { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public List<RemmRoutineLog> Entries { get; set; } = new();
}

public sealed class RemmRoutineLog
{
    public DateTime Date { get; set; } = DateTime.Today;
    public bool Completed { get; set; }
    public string Notes { get; set; } = "";
}

public sealed class RemmSchedule
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = "";
    public DateTime DateTime { get; set; } = DateTime.Now;
    public DateTime? EndDateTime { get; set; }
    public string Notes { get; set; } = "";
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
    public bool AlwaysOnTop { get; set; } = true;
    public int PeekVisiblePercent { get; set; } = 50;
    public bool DragEnabled { get; set; } = true;
    public double MascotLeft { get; set; } = double.NaN;
    public double MascotTop { get; set; } = double.NaN;
    public bool RememberMascotPosition { get; set; } = true;
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
