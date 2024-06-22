
# region imports
import subprocess
import shlex
# endregion

# region misc funs
def run_command(command, timeout=10):
    """
    Run a shell command and capture its output.

    Args:
        command (str): Shell command to execute.
        timeout (int): Maximum execution time for the command.

    Returns:
        tuple: Return code, standard output, and standard error.
    """
    process = subprocess.Popen(shlex.split(command), stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    try:
        stdout, stderr = process.communicate(timeout=timeout)
        return process.returncode, stdout.decode(), stderr.decode()
    except subprocess.TimeoutExpired:
        process.kill()
        return -1, "", "Timeout expired while executing the command."

# endregion

# region main
def get_all_devices():
    """
    Retrieve and print information about all Bluetooth devices.

    Returns:
        list: List of all Bluetooth devices.
    """
    # Run bluetoothctl command to list all devices
    command_list_all = "bluetoothctl devices"
    return_code, output, stderr = run_command(command_list_all)

    if return_code == 0:
        # Extract device information from the output
        all_devices = [line.split(' ', 1)[1].strip().split(' ', 1) for line in output.splitlines()]
        return all_devices
    else:
        print(f"Failed to fetch all devices. Error: {stderr}")
        return []

def get_paired_devices():
    """
    Retrieve and print information about paired Bluetooth devices.

    Returns:
        list: List of paired Bluetooth devices.
    """
    # Run bluetoothctl command to list paired devices
    command_list_paired = "bluetoothctl devices Paired"
    return_code, output, stderr = run_command(command_list_paired)

    if return_code == 0:
        # Extract paired device information from the output
        paired_devices = [line.split(' ', 1)[1].strip().split(' ', 1) for line in output.splitlines()]
        return paired_devices
    else:
        print(f"Failed to fetch paired devices. Error: {stderr}")
        return []

def get_connected_devices():
    """
    Retrieve and print information about connected Bluetooth devices.

    Returns:
        list: List of connected Bluetooth devices.
    """
    # Run bluetoothctl command to list connected devices
    command_list_connected = "bluetoothctl devices Connected"
    return_code, output, stderr = run_command(command_list_connected)

    if return_code == 0:
        # Extract connected device information from the output
        connected_devices = [line.split(' ', 1)[1].strip().split(' ', 1) for line in output.splitlines()]
        return connected_devices
    else:
        print(f"Failed to fetch connected devices. Error: {stderr}")
        return []

def search_devices():
    """
    Scan for nearby Bluetooth devices.

    Returns:
        list: List of discovered Bluetooth devices.
    """
    # Run the bluetoothctl command to scan for devices
    command_scan = "bluetoothctl scan on"
    print("Scanning for Bluetooth devices!")
    return_code, stdout, stderr = run_command(command_scan)

    if return_code == 0 or return_code == -1:
        print("Scan ended")
        devices = get_all_devices()
        return devices
    else:
        print(f"Return code: {return_code}. Error: {stderr}")
        print(f"Error: {stdout}")
        return []

def pair_and_trust_device(device_address):
    """
    Pair and trust a Bluetooth device.

    Args:
        device_address (str): Address of the Bluetooth device to pair.

    Returns:
        None
    """
    # Run bluetoothctl command to pair the device
    command_pair = f"bluetoothctl pair {device_address}"
    return_code, stdout, stderr = run_command(command_pair)

    if return_code == 0:
        print(f"Successfully paired with device at address {device_address}")
        trust_device(device_address)
    else:
        print(f"Failed to pair with device at address {device_address}. Error: {stderr}")
        print(f"Error: {stdout}")

def trust_device(device_address):
    """
    Trust a Bluetooth device.

    Args:
        device_address (str): Address of the Bluetooth device to trust.

    Returns:
        None
    """
    # Run bluetoothctl command to trust the device
    command_trust = f"bluetoothctl trust {device_address}"
    return_code, stdout, stderr = run_command(command_trust)

    if return_code == 0:
        print(f"Successfully trusted device at address {device_address}")
    else:
        print(f"Failed to trust device at address {device_address}. Error: {stderr}")
        print(f"Error: {stdout}")

def connect_device(device_address):
    """
    Connect to a Bluetooth device.

    Args:
        device_address (str): Address of the Bluetooth device to connect.

    Returns:
        None
    """
    # Run bluetoothctl command to connect to the device
    command_connect = f"bluetoothctl connect {device_address}"
    return_code, stdout, stderr = run_command(command_connect)

    if return_code == 0:
        print(f"Successfully connected to device at address {device_address}")
    else:
        print(f"Failed to connect to device at address {device_address}. Error: {stderr}")
        print(f"Error: {stdout}")

def remove_device(device_address):
    """
    Remove a Bluetooth device.

    Args:
        device_address (str): Address of the Bluetooth device to remove.

    Returns:
        None
    """
    # Run bluetoothctl command to remove trust from the device
    command_remove_trust = f"bluetoothctl remove {device_address}"
    return_code, _, stderr = run_command(command_remove_trust)

    if return_code == 0:
        print(f"Successfully removed trust from device at address {device_address}")
    else:
        print(f"Failed to remove trust from device at address {device_address}. Error: {stderr}")

# endregion
