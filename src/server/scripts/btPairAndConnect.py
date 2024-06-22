
# region impoerts
import os
import json
import btCommands
import sys
# endregion

# region FileSystem
# Specify the path to your JSON files
file_path_scan = "BtScanOutput.json"
file_path_pair = "BtPairedDevices.json"
file_path_conn = "BtConnectedDevices.json"

def save_as_Json(data, json_file_path=file_path_scan):
    """
    Save the provided data as a JSON file.

    Args:
        data (list): List of Bluetooth devices.
        json_file_path (str): Path to the JSON file.

    Returns:
        None
    """
    # Format the array
    for entry in data:
        if len(entry) > 2:
            del entry[0]

    # Save the array as a JSON file
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=2)

    print(f"Data saved to {json_file_path}")

def read_json(json_file_path=file_path_scan):
    """
    Read JSON data from a file and remove the file after processing.

    Args:
        json_file_path (str): Path to the JSON file.

    Returns:
        list: List of Bluetooth devices.
    """
    devices = []

    # Check if the file exists
    if os.path.exists(json_file_path):
        # Read the JSON data from the file
        with open(json_file_path, 'r', encoding='utf-8') as json_file:
            devices = json.load(json_file)

        # After processing the data, remove the file
        try:
            os.remove(json_file_path)
            print(f"File '{json_file_path}' removed.")
        except FileNotFoundError:
            print(f"File '{json_file_path}' not found.")
        except Exception as e:
            print(f"An error occurred while trying to remove the file: {e}")
    else:
        print(f"The file '{json_file_path}' does not exist.")

    return devices

# endregion

# region main
def get_connected_devices():
    """
    Retrieve and print connected Bluetooth devices.

    Returns:
        list: List of connected Bluetooth devices.
    """
    devices_connected = btCommands.get_connected_devices()

    if devices_connected:
        print(f"Connected Devices: '{devices_connected}'")
        for device in devices_connected:
            print(f"Connected Device: '{device[1]}' (Address: {device[0]})")
            sys.stdout.flush()

    save_as_Json(devices_connected, file_path_conn)
    return devices_connected

def get_paired_devices():
    """
    Retrieve and print all paired Bluetooth devices.

    Returns:
        list: List of all paired Bluetooth devices.
    """
    devices_all = btCommands.get_paired_devices()

    if devices_all:
        print(f"All Paired Devices: '{devices_all}'")
        for device in devices_all:
            print(f"All Paired Device: '{device[1]}' (Address: {device[0]})")

    save_as_Json(devices_all, file_path_pair)
    return devices_all

def get_nonConnected_devices():
    """
    Retrieve and print non-connected Bluetooth devices.

    Returns:
        list: List of non-connected Bluetooth devices.
    """

    devices_connected = get_connected_devices()
    devices_all = get_paired_devices()

    # Extract the device names from each device in the connected devices list
    connected_device_names = set(device[0] for device in devices_connected)

    # Filter out non-connected devices from the devices_all list
    non_connected_devices = [device for device in devices_all if device[0] not in connected_device_names]

    # Print non-connected devices
    for device in non_connected_devices:
        print(f"Non-connected Device: {device}")

    return non_connected_devices

def removeNonConnected():
    """
    Remove non-connected Bluetooth devices.
    """

    non_connected_devices = get_nonConnected_devices()

    for device in non_connected_devices:
        print(f"Removing Non-connected Device: {device[1]} ({device[0]})")
        btCommands.remove_device(device[0])

def removeConnected():
    """
    Remove connected Bluetooth devices.
    """

    connected_devices = get_connected_devices()

    for device in connected_devices:
        print(f"Removing connected Device: {device[1]} ({device[0]})")
        btCommands.remove_device(device[0])

def updatePairInfo():
    """
    Update information about paired and connected Bluetooth devices.
    """
    get_paired_devices()
    get_connected_devices()

def pairScan(json_file_path = file_path_scan):
    """
    Perform Bluetooth pairing based on the devices listed in the specified JSON file.

    Args:
        json_file_path (str): Path to the JSON file containing device information.

    Returns:
        None
    """
    devices = read_json(json_file_path)

    if devices:
        # Print or use the loaded data
        print(f"Raw data: '{devices}'")

        for device in devices:
            print(f"Device: '{device[1]}' (Address: {device[0]})")
            btCommands.pair_and_trust_device(device[0])
            btCommands.connect_device(device[0])

        updatePairInfo()
    else:
        print("No device info found")

# endregion
