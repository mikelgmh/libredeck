Add-Type -AssemblyName System.Windows.Forms
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "LibreDeck Daemon"
$contextMenu = New-Object System.Windows.Forms.ContextMenu
$openItem = New-Object System.Windows.Forms.MenuItem
$openItem.Text = "Abrir LibreDeck"
$openItem.Add_Click({ Start-Process "http://localhost:3001" })
$exitItem = New-Object System.Windows.Forms.MenuItem
$exitItem.Text = "Salir"
$exitItem.Add_Click({ $notifyIcon.Visible = $false; exit })
$contextMenu.MenuItems.Add($openItem)
$contextMenu.MenuItems.Add($exitItem)
$notifyIcon.ContextMenu = $contextMenu
$notifyIcon.Visible = $true
$notifyIcon.ShowBalloonTip(2000, "LibreDeck", "Daemon running", [System.Windows.Forms.ToolTipIcon]::Info)
$appContext = New-Object System.Windows.Forms.ApplicationContext
[System.Windows.Forms.Application]::Run($appContext)