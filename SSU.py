import sys
import os
import subprocess
import time
import winreg
import json
from pynput import mouse, keyboard  # Global input listeners
from PyQt5 import QtWidgets, QtGui, QtCore
import win32gui
import win32process
import win32con
import win32api

# Configuration handling
CONFIG_FILE = os.path.join(os.path.expanduser('~'), '.carbon_screen_config.json')

def load_config():
    """Load configuration from file."""
    default_config = {
        'startup_enabled': False,
        'idle_threshold_minutes': 1
    }
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
    return default_config

def save_config(config):
    """Save configuration to file."""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
    except Exception as e:
        print(f"Error saving config: {e}")

def is_in_startup():
    """Check if the application is set to start with Windows."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                            r"Software\Microsoft\Windows\CurrentVersion\Run",
                            0, winreg.KEY_READ)
        try:
            winreg.QueryValueEx(key, "CarbonScreen")
            return True
        except WindowsError:
            return False
        finally:
            winreg.CloseKey(key)
    except Exception as e:
        print(f"Error checking startup status: {e}")
        return False

def toggle_startup(enable):
    """Add or remove the application from Windows startup."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                            r"Software\Microsoft\Windows\CurrentVersion\Run",
                            0, winreg.KEY_SET_VALUE)
        if enable:
            exe_path = sys.executable
            script_path = os.path.abspath(sys.argv[0])
            value = f'"{exe_path}" "{script_path}" --startup'
            winreg.SetValueEx(key, "CarbonScreen", 0, winreg.REG_SZ, value)
        else:
            try:
                winreg.DeleteValue(key, "CarbonScreen")
            except WindowsError:
                pass
        winreg.CloseKey(key)
        return True
    except Exception as e:
        print(f"Error toggling startup: {e}")
        return False

def resource_path(relative_path):
    """
    Get the absolute path to a resource.
    Works both in development and when bundled by PyInstaller.
    """
    try:
        # PyInstaller creates a temporary folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Global variable for tracking last input time
last_activity_time = time.time()

def update_last_activity():
    global last_activity_time
    last_activity_time = time.time()

def is_application_fullscreen():
    """Check if any application is running in fullscreen mode."""
    try:
        # Get the foreground window
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return False

        # Get the window placement
        placement = win32gui.GetWindowPlacement(hwnd)
        if placement[1] == win32con.SW_SHOWMAXIMIZED:
            # Get the window rect
            rect = win32gui.GetWindowRect(hwnd)
            # Get the screen dimensions
            screen_width = win32api.GetSystemMetrics(win32con.SM_CXSCREEN)
            screen_height = win32api.GetSystemMetrics(win32con.SM_CYSCREEN)
            
            # Check if the window covers the entire screen
            return (rect[0] == 0 and rect[1] == 0 and 
                   rect[2] == screen_width and rect[3] == screen_height)
    except Exception as e:
        print(f"Error checking fullscreen status: {e}")
    return False

# --- Global Input Listeners using pynput ---
def on_mouse_move(x, y):
    update_last_activity()

def on_mouse_click(x, y, button, pressed):
    update_last_activity()

def on_mouse_scroll(x, y, dx, dy):
    update_last_activity()

def on_key_press(key):
    update_last_activity()

def on_key_release(key):
    update_last_activity()

# Start the input listeners in background threads
mouse_listener = mouse.Listener(
    on_move=on_mouse_move,
    on_click=on_mouse_click,
    on_scroll=on_mouse_scroll)
keyboard_listener = keyboard.Listener(
    on_press=on_key_press,
    on_release=on_key_release)
mouse_listener.start()
keyboard_listener.start()

# --- IdleChecker: Uses a Qt Timer and emits countdown updates ---
class IdleChecker(QtCore.QObject):
    # Signal to update the countdown timer in the GUI (remaining seconds)
    updateCountdown = QtCore.pyqtSignal(int)

    def __init__(self, threshold_minutes):
        super().__init__()
        self.threshold_seconds = threshold_minutes * 60
        self.active = True
        self.screensaver_running = False
        self.timer = QtCore.QTimer(self)
        self.timer.timeout.connect(self.check_idle)
        self.timer.start(1000)  # Check every second
        self.fullscreen_check_timer = QtCore.QTimer(self)
        self.fullscreen_check_timer.timeout.connect(self.check_fullscreen)
        self.fullscreen_check_timer.start(5000)  # Check every 5 seconds
        self.last_fullscreen_check = time.time()
        print("IdleChecker started with a threshold of", self.threshold_seconds, "seconds")

    def check_fullscreen(self):
        """Check if any application is fullscreen and update the last activity time if needed."""
        if is_application_fullscreen():
            current_time = time.time()
            # If it's been more than an hour since the last fullscreen check
            if current_time - self.last_fullscreen_check >= 3600:  # 3600 seconds = 1 hour
                update_last_activity()
                self.last_fullscreen_check = current_time

    def check_idle(self):
        if not self.active:
            return
        current_time = time.time()
        idle_time = current_time - last_activity_time

        # Reset the screensaver flag if the user has become active again
        if idle_time < self.threshold_seconds and self.screensaver_running:
            self.screensaver_running = False

        # Calculate remaining time until screensaver should trigger
        remaining_time = self.threshold_seconds - idle_time
        if remaining_time < 0:
            remaining_time = 0
        self.updateCountdown.emit(int(remaining_time))

        # Only start screensaver if not in fullscreen mode
        if idle_time >= self.threshold_seconds and not self.screensaver_running and not is_application_fullscreen():
            print("Idle threshold exceeded. Launching screensaver.")
            self.start_screensaver()
            self.screensaver_running = True

    def start_screensaver(self):
        # Launch the default Windows screensaver (adjust the path if needed)
        screensaver_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'),
                                        'System32', 'scrnsave.scr')
        try:
            subprocess.Popen([screensaver_path, '/s'])
        except Exception as e:
            print("Failed to start screensaver:", e)

    def set_threshold(self, threshold_minutes):
        self.threshold_seconds = threshold_minutes * 60
        print("Updated idle threshold to", self.threshold_seconds, "seconds")

    def set_active(self, active):
        self.active = active
        print("IdleChecker is now", "active" if active else "inactive")
        if active:
            self.screensaver_running = False

# --- Main Application Window & System Tray ---
class MainWindow(QtWidgets.QWidget):
    def __init__(self, idle_checker):
        super().__init__()
        self.setWindowTitle("Carbon Screen")
        # Set the application icon using resource_path
        icon_file = resource_path("icon.ico")
        if os.path.exists(icon_file):
            self.setWindowIcon(QtGui.QIcon(icon_file))
        self.idle_checker = idle_checker
        # Connect the countdown signal to update the countdown label
        self.idle_checker.updateCountdown.connect(self.update_countdown_label)
        
        # Load configuration
        self.config = load_config()
        self.initUI()
        
        # Apply loaded configuration
        # Check actual registry state for startup setting
        actual_startup_state = is_in_startup()
        self.startup_checkbox.setChecked(actual_startup_state)
        # Update config to match actual state
        self.config['startup_enabled'] = actual_startup_state
        save_config(self.config)
        
        self.threshold_input.setValue(self.config['idle_threshold_minutes'])
        self.idle_checker.set_threshold(self.config['idle_threshold_minutes'])

    def initUI(self):
        layout = QtWidgets.QVBoxLayout()

        # Checkbox for "Start with Windows"
        self.startup_checkbox = QtWidgets.QCheckBox("Start with Windows")
        self.startup_checkbox.stateChanged.connect(self.handle_startup_checkbox)
        layout.addWidget(self.startup_checkbox)

        label = QtWidgets.QLabel("Idle Time Threshold (minutes):")
        self.threshold_input = QtWidgets.QSpinBox()
        self.threshold_input.setRange(1, 120)
        self.threshold_input.setValue(1)
        self.threshold_input.setSuffix(" min")
        self.threshold_input.valueChanged.connect(self.update_threshold)
        layout.addWidget(label)
        layout.addWidget(self.threshold_input)

        # Countdown timer label
        self.countdown_label = QtWidgets.QLabel("Time remaining: 60 sec")
        layout.addWidget(self.countdown_label)

        self.toggle_button = QtWidgets.QPushButton("Turn Off")
        self.toggle_button.setCheckable(True)
        self.toggle_button.clicked.connect(self.toggle_active)
        layout.addWidget(self.toggle_button)

        self.setLayout(layout)

    def handle_startup_checkbox(self, state):
        if toggle_startup(state == QtCore.Qt.Checked):
            self.config['startup_enabled'] = (state == QtCore.Qt.Checked)
            save_config(self.config)
            if state == QtCore.Qt.Checked:
                QtWidgets.QMessageBox.information(None, "Startup Setting",
                                                "The application has been added to Windows startup.")
            else:
                QtWidgets.QMessageBox.information(None, "Startup Setting",
                                                "The application has been removed from Windows startup.")
        else:
            # Revert checkbox if operation failed
            self.startup_checkbox.setChecked(not self.startup_checkbox.isChecked())
            QtWidgets.QMessageBox.warning(None, "Error",
                                        "Failed to update startup setting.")

    def update_countdown_label(self, seconds):
        self.countdown_label.setText(f"Time remaining: {seconds} sec")

    def update_threshold(self, value):
        self.idle_checker.set_threshold(value)
        self.countdown_label.setText(f"Time remaining: {value * 60} sec")
        # Save the new threshold to config
        self.config['idle_threshold_minutes'] = value
        save_config(self.config)

    def toggle_active(self):
        if self.toggle_button.isChecked():
            self.idle_checker.set_active(False)
            self.toggle_button.setText("Turn On")
        else:
            self.idle_checker.set_active(True)
            self.toggle_button.setText("Turn Off")

    def closeEvent(self, event):
        # Override close event: hide window instead of quitting
        event.ignore()
        self.hide()
        if hasattr(self, 'trayIcon'):
            self.trayIcon.showMessage(
                "Still Running",
                "Application is minimized to the system tray.",
                QtWidgets.QSystemTrayIcon.Information,
                2000
            )

def main():
    app = QtWidgets.QApplication(sys.argv)
    
    # --- Single Instance Check using QSharedMemory ---
    single_instance = QtCore.QSharedMemory("CarbonScreenUniqueKey")
    if not single_instance.create(1):
        QtWidgets.QMessageBox.warning(None, "Already Running",
                                      "Another instance of Carbon Screen is already running.")
        sys.exit(0)
    app.single_instance = single_instance

    # Load configuration
    config = load_config()
    idle_checker = IdleChecker(threshold_minutes=config['idle_threshold_minutes'])
    window = MainWindow(idle_checker)

    # Create system tray icon using the bundled icon if available
    icon_file = resource_path("icon.ico")
    if os.path.exists(icon_file):
        tray_icon = QtGui.QIcon(icon_file)
    else:
        tray_icon = app.style().standardIcon(QtWidgets.QStyle.SP_ComputerIcon)
    trayIcon = QtWidgets.QSystemTrayIcon(tray_icon, parent=app)
    
    # Create Tray Menu with an option to add to startup, show window, and quit
    trayMenu = QtWidgets.QMenu()
    addStartupAction = trayMenu.addAction("Add to Startup")
    showAction = trayMenu.addAction("Show")
    quitAction = trayMenu.addAction("Quit")
    trayIcon.setContextMenu(trayMenu)
    addStartupAction.triggered.connect(lambda: window.startup_checkbox.setChecked(True))
    showAction.triggered.connect(window.show)
    quitAction.triggered.connect(QtWidgets.QApplication.quit)
    trayIcon.show()

    window.trayIcon = trayIcon  # Pass the tray icon to the window for notifications

    # Check if the app was launched with the "--startup" flag. If so, start hidden.
    if "--startup" not in sys.argv:
        window.show()

    sys.exit(app.exec_())

if __name__ == '__main__':
    main()