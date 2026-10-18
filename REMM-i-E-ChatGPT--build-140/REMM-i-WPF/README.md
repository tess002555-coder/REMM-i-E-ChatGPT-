# REMM(i)E — Windows Desktop

REMM(i)E is a Windows floating mascot and personal productivity app. WPF provides the native window shells and Windows integration; WebView2 hosts the HTML, CSS, and JavaScript interface; C# owns local data, validation, window behavior, settings, and backup/restore.

## Requirements

- Windows 10 or 11
- .NET 8 SDK to build from source
- .NET 8 Desktop Runtime when running a framework-dependent build; self-contained releases include it
- Microsoft Edge WebView2 Runtime to run the app

## Run from source

From the repository root:

    dotnet restore .\REMM-i-WPF\REMM-i-WPF.csproj
    dotnet run --project .\REMM-i-WPF\REMM-i-WPF.csproj

Build Release:

    dotnet build .\REMM-i-WPF\REMM-i-WPF.csproj -c Release

Publish a self-contained x64 build:

    dotnet publish .\REMM-i-WPF\REMM-i-WPF.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true

The publish folder contains REMM-i.exe and the WebUI folder. Keep that folder beside the executable; the app loads its pages and mascot asset relative to AppContext.BaseDirectory. The WebView2 Runtime is installed separately by Microsoft Edge or its evergreen runtime installer.

## Use the app

- Click the floating mascot to open the panel. Drag it to move it; it snaps to the nearest screen edge when released.
- Use the panel to add, edit, complete, search, filter, or remove tasks; manage routine frequency and active state; add schedules with start/end times and descriptions; and view schedules on the calendar.
- Settings control the mascot drag/snap behavior, always-on-top behavior, remembered window positions, colors, transparency, and uploaded mascot poses.
- Backup and restore use JSON files selected with native Windows dialogs.
- The power button in the panel closes the app. The × button closes only the panel.

Local data is stored at %APPDATA%\REMM-i\remm-data.json; uploaded mascot poses are stored in %APPDATA%\REMM-i\poses.

## Current feature boundaries

Task, routine, schedule, calendar, search/filter, settings, local JSON storage, pose upload, and backup/restore are connected to the C# backend. Notification preferences are saved, but automatic reminders are not active. Edlink and Google Calendar synchronization are not implemented.
