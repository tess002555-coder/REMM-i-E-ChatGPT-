using System;
using System.Linq;
using System.Windows;
using WpfBrushes = System.Windows.Media.Brushes;

namespace RemmI;

public enum EntryKind { Schedule, Routine, Task }

public partial class EntryDialogWindow : Window
{
    private readonly RemmData _data;
    private readonly EntryKind _kind;
    public event EventHandler? Saved;

    public EntryDialogWindow(RemmData data, EntryKind kind)
    {
        InitializeComponent();
        _data = data;
        _kind = kind;
        DateBox.SelectedDate = DateTime.Now;
        Configure();
    }

    private void Configure()
    {
        switch (_kind)
        {
            case EntryKind.Schedule:
                TitleText.Text = "● TAMBAH ACARA KALENDER";
                NameLabel.Text = "Nama Acara Kalender";
                DateLabel.Text = "Tanggal & waktu acara";
                PriorityLabel.Visibility = Visibility.Collapsed;
                PriorityBox.Visibility = Visibility.Collapsed;
                NotesLabel.Visibility = Visibility.Collapsed;
                NotesBox.Visibility = Visibility.Collapsed;
                Height = 255;
                break;
            case EntryKind.Routine:
                TitleText.Text = "● TAMBAH RUTINITAS";
                NameLabel.Text = "Nama Rutinitas";
                DateLabel.Text = "Tanggal mulai";
                PriorityLabel.Visibility = Visibility.Collapsed;
                PriorityBox.Visibility = Visibility.Collapsed;
                DateBox.SelectedDate = DateTime.Today;
                break;
            default:
                TitleText.Text = "● TAMBAH TUGAS BARU";
                NameLabel.Text = "Nama Tugas";
                DateLabel.Text = "Batas Waktu Tugas (Deadline)";
                DateBox.SelectedDate = DateTime.Today;
                break;
        }
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        var name = NameBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            MessageBox.Show("Nama tidak boleh kosong.", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var date = DateBox.SelectedDate ?? DateTime.Now;
        if (_kind == EntryKind.Schedule)
            _data.Schedules.Add(new RemmSchedule { Title = name, DateTime = date });
        else if (_kind == EntryKind.Routine)
            _data.Routines.Add(new RemmRoutine { Title = name, CreatedDate = date, Notes = NotesBox.Text.Trim() });
        else
        {
            var priority = (PriorityBox.SelectedItem as System.Windows.Controls.ComboBoxItem)?.Content?.ToString() ?? "Sedang";
            _data.Tasks.Add(new RemmTask { Title = name, Priority = priority, Deadline = date });
        }

        try
        {
            RemmDataService.Save(_data);
            Saved?.Invoke(this, EventArgs.Empty);
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Data tidak dapat disimpan:\n{ex.Message}", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void Cancel_Click(object sender, RoutedEventArgs e) => Close();
}
