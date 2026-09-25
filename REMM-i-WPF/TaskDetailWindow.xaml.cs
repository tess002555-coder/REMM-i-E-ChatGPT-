using System;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;

namespace RemmI;

public partial class TaskDetailWindow : Window
{
    private readonly RemmData _data;
    private readonly RemmTask _task;
    public event EventHandler? Changed;

    public TaskDetailWindow(Window owner, RemmData data, RemmTask task)
    {
        InitializeComponent();
        Owner = owner;
        _data = data;
        _task = task;
        LoadTask();
    }

    private void LoadTask()
    {
        TitleBox.Text = _task.Title;
        DateBox.SelectedDate = _task.Deadline?.Date ?? DateTime.Today;
        TimeBox.Text = (_task.Deadline ?? DateTime.Now).ToString("HH:mm");
        CompletedCheck.IsChecked = _task.Completed;
        NotesBox.Text = _task.Notes;
        foreach (var item in PriorityBox.Items.OfType<ComboBoxItem>())
            if (string.Equals(item.Content?.ToString(), _task.Priority, StringComparison.OrdinalIgnoreCase))
                item.IsSelected = true;
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        var title = TitleBox.Text.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            MessageBox.Show("Nama tugas tidak boleh kosong.", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        var date = DateBox.SelectedDate ?? DateTime.Today;
        if (!DateTime.TryParseExact(TimeBox.Text.Trim(), new[] { "HH:mm", "H:mm" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            MessageBox.Show("Jam harus memakai format HH:mm, contoh 09:30.", "REMM(i)", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        _task.Title = title;
        _task.Priority = (PriorityBox.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Sedang";
        _task.Completed = CompletedCheck.IsChecked == true;
        _task.Deadline = date.Date.Add(time.TimeOfDay);
        _task.Notes = NotesBox.Text.Trim();
        RemmDataService.Save(_data);
        Changed?.Invoke(this, EventArgs.Empty);
        Close();
    }

    private void Delete_Click(object sender, RoutedEventArgs e)
    {
        if (MessageBox.Show($"Hapus tugas '{_task.Title}'?", "REMM(i)", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes)
            return;
        _data.Tasks.RemoveAll(t => t.Id == _task.Id);
        RemmDataService.Save(_data);
        Changed?.Invoke(this, EventArgs.Empty);
        Close();
    }

    private void Close_Click(object sender, RoutedEventArgs e) => Close();
}