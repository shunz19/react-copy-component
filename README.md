# react-copy-component
Copy a script file and its imported scripts from one project to another.

# Usage
```npx react-copy-component <Script-Path> [<Destination>]```

# Options

| Options | Description |
| --- | --- |
| `<Script-Path>` | The script that will be copied to the destination |
| `<Destination>` | The destination of the copied script, `Default: Current Working Directory` |
| `--dry-run` | Run command without applying changes |
| `--install-all` | Install dependencies imported by the script |