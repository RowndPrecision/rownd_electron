
# region imports
import sys
import btCommands
import btPairAndConnect
from gi.repository import GLib
from dbus.mainloop.glib import DBusGMainLoop
import dbus
# endregion

# region Misc. funs
mainloop = None

# List of keywords related to Bluetooth controllers
global_keywords  = ["dualshock", "dualsense", "controller"]

# Misc. function to compare bluetooth device names with keywords to find controllers
def contains_keyword(element):
    # Convert both element and keywords to lowercase for case-insensitive comparison
    element_lower = element.lower()
    keywords_lower = [keyword.lower() for keyword in global_keywords]

    # Check if any keyword is present in the element
    for keyword_lower in keywords_lower:
        if keyword_lower in element_lower:
            return True
    return False

# endregion

# region main funs
# Scan and update Json files
def scan():
    # Update pair information (if any)
    btPairAndConnect.updatePairInfo()

    # Search for nearby Bluetooth devices
    nearby_devices = btCommands.search_devices()

    # List to store controllers among nearby devices
    nearby_contrls = []

    if nearby_devices:
        print("Nearby Bluetooth Devices:")
        sys.stdout.flush()
        # Iterate through each nearby device
        for device in nearby_devices:
            # Check if the device name contains any specified controller keywords
            if contains_keyword(device[1]):
                nearby_contrls.append(device)
            try: # Print device information (catch UnicodeEncodeError if encountered)
                print(f"  {device}")
                sys.stdout.flush()
            except UnicodeEncodeError as e:
                print(f"UnicodeEncodeError: {e}")
                sys.stdout.flush()
    else:
        # If no nearby devices found
        print("No Bluetooth devices found.")
        sys.stdout.flush()

    if nearby_contrls:
        print("Nearby Controller Devices:")
        sys.stdout.flush()
        # Iterate through each nearby controller device
        for device in nearby_contrls:
            try: # Print controller device information (catch UnicodeEncodeError if encountered)
                print(f"  {device}")
                sys.stdout.flush()
            except UnicodeEncodeError as e:
                print(f"UnicodeEncodeError: {e}")
                sys.stdout.flush()

        # Save information about nearby controllers as JSON
        btPairAndConnect.save_as_Json(nearby_contrls)
    else: # If no nearby controller devices found
        print("No Controller devices found.")
        sys.stdout.flush()

# Scan all bluetoothdevices then detect and pair controllers
def scan_and_pair():
    # Uncomment the line below if removeNonConnected functionality is required
    # btPairAndConnect.removeNonConnected()

    # Perform device scan
    scan()

    # Initiate pairing scanned
    btPairAndConnect.pairScan()

# endregion

def on_console_input(fd, condition):
  command = fd.readline().strip()
  if command.isspace():
    pass
  else:
    print(command)
    sys.stdout.flush()
    # Check command-line arguments to determine the action
    if command == "scanAndPair":
      scan_and_pair()
    elif command == "scan": # perform scan only
      scan()
    elif command == "removeAllDevices":
      btPairAndConnect.removeNonConnected()
      btPairAndConnect.removeConnected()
    elif command == "removeNonConnected": # remove/clean paired but non-connected devices
      btPairAndConnect.removeNonConnected()
    # elif command == "pair": # initiate pairing with a specified address
    #   if len(sys.argv) == 3:
    #     btCommands.pair_and_trust_device(sys.argv[2])
    #   else:
    #     print("Usage: python btScan.py pair <address>")
    #     sys.stdout.flush()
    # elif command == "connect": # connect to a specified device
    #   if len(sys.argv) == 3:
    #     btCommands.connect_device(sys.argv[2])
    #   else:
    #     print("Usage: python btScan.py connect <address>")
    #     sys.stdout.flush()
    # elif command == "remove": # remove a specified device
    #   if len(sys.argv) == 3:
    #     btCommands.remove_device(sys.argv[2])
    #   else:
    #     print("Usage: python btScan.py remove <address>")
    #     sys.stdout.flush()
    else: # If an invalid command-line argument is provided
      print("Invalid command-line argument")
      sys.stdout.flush()
  return True

# region Script Execution
def main():
  global mainloop
  DBusGMainLoop(set_as_default=True)
  bus = dbus.SystemBus()

  btPairAndConnect.removeNonConnected()
  btPairAndConnect.removeConnected()

  mainloop = GLib.MainLoop()

  GLib.io_add_watch(sys.stdin, GLib.IO_IN, on_console_input)

  try:
    mainloop.run()
  except KeyboardInterrupt:
    print("KeyboardInterrupt except")
  finally:
    print("finally")

if __name__ == "__main__":
  main()

# endregion
