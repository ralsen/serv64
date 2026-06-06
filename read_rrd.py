import subprocess
import datetime
import json
import sys

def fetch_rrd(filename, start="-1w", end="now", cf="AVERAGE"):
    cmd = [
        "rrdtool",
        "fetch",
        filename,
        cf,
        "-s", start,
        "-e", end,
        "--resolution", "300"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(json.dumps({"error": result.stderr}))
        sys.exit(1)

    lines = result.stdout.strip().split("\n")
    header = lines[0].split()

    data = []

    for line in lines[2:]:
        if ":" not in line:
            continue

        ts, values = line.split(":")

        row = {
            "timestamp": int(ts.strip()),
            "datetime": datetime.datetime.fromtimestamp(
                int(ts.strip())
            ).isoformat()
        }

        values = values.split()

        for i, v in enumerate(values):
            # Der einfache Trick: Wenn rrdtool "nan" liefert, direkt None setzen
            if v.lower() == "nan":
                row[header[i]] = None
            else:
                try:
                    row[header[i]] = float(v)
                except:
                    row[header[i]] = None

        data.append(row)

    return data

file = sys.argv[1]
start = sys.argv[2] if len(sys.argv) > 2 else "-1w"
end = sys.argv[3] if len(sys.argv) > 3 else "now"
print(json.dumps(fetch_rrd(file, start, end)))