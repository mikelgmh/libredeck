export const getSystemMetricsScript = () => `
  try {
    # Simple CPU usage using performance counters (most reliable)
    $cpuUsage = 0
    try {
      $counter = Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 1 -ErrorAction Stop
      $cpuUsage = [math]::Round($counter.CounterSamples[0].CookedValue, 1)
    } catch {
      # Fallback: try CIM
      try {
        $cpu = Get-CimInstance -ClassName Win32_Processor -ErrorAction Stop
        $cpuUsage = [math]::Round($cpu.LoadPercentage, 1)
      } catch {
        $cpuUsage = 0
      }
    }

    # RAM using CIM (most reliable)
    $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop
    $totalMemory = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    $freeMemory = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    $usedMemory = $totalMemory - $freeMemory
    $ramUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 1)

    # Create result
    @{
      cpu = @{
        usage = $cpuUsage
        temperature = $null
      }
      ram = @{
        total = $totalMemory
        used = [math]::Round($usedMemory, 1)
        usage = $ramUsage
      }
      gpu = @{
        usage = $null
        temperature = $null
      }
      timestamp = (Get-Date).ToString('o')
    } | ConvertTo-Json -Compress
  } catch {
    # Return error with basic info
    @{
      error = $_.Exception.Message
      cpu = @{ usage = 0; temperature = $null }
      ram = @{ total = 0; used = 0; usage = 0 }
      gpu = @{ usage = $null; temperature = $null }
      timestamp = (Get-Date).ToString('o')
    } | ConvertTo-Json -Compress
  }
`;