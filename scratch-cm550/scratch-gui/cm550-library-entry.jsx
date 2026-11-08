// Inserted into packages/scratch-gui/src/lib/libraries/extensions/index.jsx
// by scripts/install-into-scratch-editor.sh (imports go near the top,
// the object is prepended to the exported array).
    {
        name: 'CM-550',
        extensionId: 'cm550',
        collaborator: 'ROBOTIS',
        iconURL: cm550IconURL,
        insetIconURL: cm550InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="ROBOTIS CM-550 컨트롤러와 다이나믹셀을 USB 또는 블루투스로 제어합니다."
                description="Description for the 'CM-550' extension"
                id="gui.extension.cm550.description"
            />
        ),
        featured: true,
        disabled: false,
        // Connection is handled by the extension itself through Web Serial /
        // Web Bluetooth, so the Scratch Link peripheral flow is not used.
        bluetoothRequired: false,
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: false,
        useAutoScan: false
    },
