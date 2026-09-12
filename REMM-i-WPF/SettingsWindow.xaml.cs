using System;
using System.IO;
using System.Windows;
using Microsoft.Win32;
using WpfButton = System.Windows.Controls.Button;
using WpfTextBox = System.Windows.Controls.TextBox;
using WpfRadioButton = System.Windows.Controls.RadioButton;

namespace RemmI;

public partial class SettingsWindow : Window
{
    private readonly RemmData _data;
    private readonly MainWindow _mascot;

    public SettingsWindow(MainWindow mascot)
    {
        InitializeComponent();
        _mascot = mascot;
        _data = RemmDataService.Load();
        LoadSettings();
    }

    private void LoadSettings()
    {
        var s = _data.Settings;
        DisplayNameText.Text = _data.DisplayName;
        OpacitySlider.Value = s.PanelOpacity;
        BackgroundColorText.Text = s.PanelBackground;
        BorderColorText.Text = s.PanelBorder;
        DragEnabledCheck.IsChecked = s.DragEnabled;
        AutoSnapCheck.IsChecked = s.AutoSnap;
        PeekSlider.Value = s.PeekVisiblePercent;
        NotificationsCheck.IsChecked = s.NotificationsEnabled;
        NotificationSoundCheck.IsChecked = s.NotificationSoundEnabled;
        VolumeSlider.Value = s.NotificationVolume;
        LeadMinutesText.Text = s.NotificationLeadMinutes.ToString();
        IntegrationUrlText.Text = s.IntegrationUrl;
        IntegrationTokenText.Text = s.IntegrationToken;
        GoogleApiKeyText.Text = s.GoogleApiKey;
        GoogleCalendarIdText.Text = s.GoogleCalendarId;
        IdlePathText.Text = s.IdleImagePath;
        PeekPathText.Text = s.PeekImagePath;
        PointingPathText.Text = s.PointingImagePath;
        AlertPathText.Text = s.AlertImagePath;
        ModeBar.IsChecked = s.PanelMode != "Floating";
        ModeFloat.IsChecked = s.PanelMode == "Floating";
        OpacitySlider_ValueChanged(null, null);
    }

    private void Header_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (e.ChangedButton == System.Windows.Input.MouseButton.Left)
            DragMove();
    }

    private void MainTab_Click(object sender, RoutedEventArgs e)
    {
        MascotSection.Visibility = Visibility.Collapsed;
        SoundSection.Visibility = Visibility.Collapsed;
        DataSection.Visibility = Visibility.Collapsed;
        if (TabMascot.IsChecked == true) MascotSection.Visibility = Visibility.Visible;
        else if (TabSound.IsChecked == true) SoundSection.Visibility = Visibility.Visible;
        else DataSection.Visibility = Visibility.Visible;
    }

    private void SubTab_Click(object sender, RoutedEventArgs e)
    {
        ThemePanel.Visibility = SubTheme.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
        InteractPanel.Visibility = SubInteract.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
        PosePanel.Visibility = SubPose.IsChecked == true ? Visibility.Visible : Visibility.Collapsed;
    }

    private void Theme_Click(object sender, RoutedEventArgs e)
    {
        if (sender is WpfButton button && button.Tag is string theme)
        {
            _data.Settings.Theme = theme;
            if (theme == "Soft Sakura Pink")
            {
                BackgroundColorText.Text = "#21181E";
                BorderColorText.Text = "#F39BB8";
            }
            else if (theme == "Clean Milk White")
            {
                BackgroundColorText.Text = "#F5F5F5";
                BorderColorText.Text = "#D3D3D3";
            }
            else if (theme == "Emerald Forest")
            {
                BackgroundColorText.Text = "#101C19";
                BorderColorText.Text = "#34D399";
            }
            else if (theme == "Minimal Obsidian")
            {
                BackgroundColorText.Text = "#0F1114";
                BorderColorText.Text = "#56616B";
            }
            else
            {
                BackgroundColorText.Text = "#15181D";
                BorderColorText.Text = "#22D3EE";
            }
        }
    }

    private void OpacitySlider_ValueChanged(object? sender, RoutedPropertyChangedEventArgs<double>? e)
    {
        if (OpacityValue != null)
            OpacityValue.Text = $"{OpacitySlider.Value * 100:0}%";
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var s = _data.Settings;
            _data.DisplayName = string.IsNullOrWhiteSpace(DisplayNameText.Text) ? "Maskot Denia" : DisplayNameText.Text.Trim();
            s.PanelOpacity = Math.Clamp(OpacitySlider.Value, 0.65, 1.0);
            s.PanelBackground = BackgroundColorText.Text.Trim();
            s.PanelBorder = BorderColorText.Text.Trim();
            s.DragEnabled = DragEnabledCheck.IsChecked == true;
            s.AutoSnap = AutoSnapCheck.IsChecked == true;
            s.PeekVisiblePercent = (int)Math.Round(Math.Clamp(PeekSlider.Value, 50, 90));
            s.NotificationsEnabled = NotificationsCheck.IsChecked == true;
            s.NotificationSoundEnabled = NotificationSoundCheck.IsChecked == true;
            s.NotificationVolume = (int)Math.Round(Math.Clamp(VolumeSlider.Value, 0, 100));
            if (!int.TryParse(LeadMinutesText.Text, out var lead)) lead = 5;
            s.NotificationLeadMinutes = Math.Clamp(lead, 0, 1440);
            s.IntegrationUrl = IntegrationUrlText.Text.Trim();
            s.IntegrationToken = IntegrationTokenText.Text.Trim();
            s.GoogleApiKey = GoogleApiKeyText.Text.Trim();
            s.GoogleCalendarId = string.IsNullOrWhiteSpace(GoogleCalendarIdText.Text) ? "primary" : GoogleCalendarIdText.Text.Trim();

            // Copy selected pose files into the application's AppData folder.
            // This prevents the app from depending on a removable/download folder
            // and makes the saved configuration stable after restarting the app.
            s.IdleImagePath = PersistPose(IdlePathText.Text, "idle", s.IdleImagePath);
            s.PeekImagePath = PersistPose(PeekPathText.Text, "peek", s.PeekImagePath);
            s.PointingImagePath = PersistPose(PointingPathText.Text, "pointing", s.PointingImagePath);
            s.AlertImagePath = PersistPose(AlertPathText.Text, "alert", s.AlertImagePath);

            s.PanelMode = ModeFloat.IsChecked == true ? "Floating" : "Mode Bar";
            RemmDataService.Save(_data);
            _mascot.ApplySettings(s);

            // Do not set DialogResult here. SettingsWindow is opened modelessly
            // with Show(), so assigning DialogResult would throw and terminate the app.
            Title = "Pengaturan Terpusat — Tersimpan";
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Pengaturan gagal disimpan:\n{ex.Message}", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private static string PersistPose(string source, string mode, string previousPath)
    {
        source = source?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(source))
            return "";
        if (!File.Exists(source))
            return previousPath ?? "";

        var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "REMM-i", "poses");
        Directory.CreateDirectory(folder);
        var extension = Path.GetExtension(source);
        if (string.IsNullOrWhiteSpace(extension)) extension = ".png";
        var destination = Path.Combine(folder, $"{mode}{extension.ToLowerInvariant()}");

        var sourceFull = Path.GetFullPath(source);
        var destinationFull = Path.GetFullPath(destination);
        if (!string.Equals(sourceFull, destinationFull, StringComparison.OrdinalIgnoreCase))
            File.Copy(sourceFull, destinationFull, true);

        return destinationFull;
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();

    private void IdleBrowse_Click(object sender, RoutedEventArgs e) => BrowseTo(IdlePathText);
    private void PeekBrowse_Click(object sender, RoutedEventArgs e) => BrowseTo(PeekPathText);
    private void PointingBrowse_Click(object sender, RoutedEventArgs e) => BrowseTo(PointingPathText);
    private void AlertBrowse_Click(object sender, RoutedEventArgs e) => BrowseTo(AlertPathText);

    private static void BrowseTo(WpfTextBox target)
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Gambar PNG/JPG|*.png;*.jpg;*.jpeg|Semua file|*.*",
            CheckFileExists = true,
            Multiselect = false
        };
        if (dialog.ShowDialog() == true)
            target.Text = dialog.FileName;
    }

    private void Export_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SaveFileDialog
        {
            FileName = "remm-backup.json",
            Filter = "REMM backup (*.json)|*.json"
        };
        if (dialog.ShowDialog() != true) return;
        try
        {
            File.WriteAllText(dialog.FileName, System.Text.Json.JsonSerializer.Serialize(_data, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Backup gagal dibuat:\n{ex.Message}", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void Import_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Filter = "REMM backup (*.json)|*.json" };
        if (dialog.ShowDialog() != true) return;
        try
        {
            RemmDataService.ImportBackup(dialog.FileName);
            MessageBox.Show("Data berhasil dipulihkan. Buka kembali panel untuk memuat konfigurasi.", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Backup tidak valid:\n{ex.Message}", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void TestIntegration_Click(object sender, RoutedEventArgs e)
        => MessageBox.Show("Konfigurasi integrasi tersimpan sebagai endpoint lokal. Koneksi nyata akan membutuhkan API yang valid.", "EDLINK", MessageBoxButton.OK, MessageBoxImage.Information);

    private void TestCalendar_Click(object sender, RoutedEventArgs e)
        => MessageBox.Show("Konfigurasi Google Calendar siap disimpan. Sinkronisasi nyata membutuhkan kredensial/API Google yang valid.", "Google Calendar", MessageBoxButton.OK, MessageBoxImage.Information);

    private void RunSql_Click(object sender, RoutedEventArgs e)
        => MessageBox.Show("Simulator menerima query teks. Eksekusi SQLite penuh belum diaktifkan pada build WPF ini.", "SQLite Query Simulator", MessageBoxButton.OK, MessageBoxImage.Information);
}
