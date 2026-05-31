import { selectGraph } from './DiagramSelection.js';

// --------------------------------------------------
// Globale Daten
// --------------------------------------------------
var gdata = {};
window.gdata = gdata;

var selectedDevice = "";

// --------------------------------------------------
// Socket.IO Verbindung
// --------------------------------------------------
const socket = io("http://192.168.2.87:3000");

// --------------------------------------------------
// Diagrammwechsel bleibt wie gehabt
// --------------------------------------------------
function selectDiagram() {

    fetch('DiagramSelektion.html')
        .then(response => response.text())
        .then(() => {
            document.body.innerHTML = "";
            selectGraph();
        });
}

var select_Diagram = document.getElementById("diagram_select");
if (select_Diagram) {
    select_Diagram.addEventListener("click", selectDiagram);
}

// --------------------------------------------------
// Daten vom Server empfangen (NEU statt fetch)
// --------------------------------------------------
socket.on("device_data", (data) => {

    gdata = data;

    createTable();
    createDeviceList();
});

// optional Fehler
socket.on("connect_error", (err) => {
    console.error("Socket Fehler:", err);
});

// --------------------------------------------------
// DEVICE LIST
// --------------------------------------------------
var buttonContainer = document.getElementById("button-container");

function createDeviceList() {

    if (!buttonContainer) return;

    buttonContainer.innerHTML = "";

    const keys = Object.keys(gdata);

    keys.forEach(key => {

        const button = document.createElement("button");

        button.classList.add('button', 'hover-effect', 'active-effect');
        button.textContent = key;
        button.id = key;

        if (gdata[key]?.stat?.Active === 'False') {
            button.style.backgroundColor = 'red';
        }

        button.addEventListener("click", function () {
            sendName(this.id);
        });

        buttonContainer.appendChild(button);
    });
}

// --------------------------------------------------
// TABLE (dein Original, nur unverändert übernommen)
// --------------------------------------------------
let table;

function createTable() {

    if (selectedDevice == "") return;

    const obj = selectedDevice;

    const tableDiv = document.querySelector("#tabelle");

    if (!tableDiv) return;

    if (table) {
        tableDiv.removeChild(table);
    }

    table = document.createElement('table');

    let row = table.insertRow();

    const keys = Object.keys(gdata[obj]);

    let CellType = 'infocell';

    keys.forEach(infokey => {

        const field = Object.keys(gdata[obj][infokey]);

        field.forEach(fieldkey => {

            const value = gdata[obj][infokey][fieldkey];

            if (row.cells.length >= 6) {
                row = table.insertRow();
            }

            if (value == '- - - - >') {
                CellType = 'statcell';
                row = table.insertRow();
            } else {
                CellType = 'infocell';
            }

            const cell = row.insertCell();

            const fieldkeySpan = document.createElement("span");
            fieldkeySpan.textContent = fieldkey + ": ";
            fieldkeySpan.classList.add("fieldkey");

            const valueSpan = document.createElement("span");
            valueSpan.textContent = value;
            valueSpan.classList.add("value");

            valueSpan.classList.remove("value_alert", "value_norm");

            if (fieldkey == "Active" && value == "False") {
                valueSpan.classList.add("value_alert");
            } else {
                valueSpan.classList.add("value_norm");
            }

            if (fieldkey.substring(2) == "in_range") {

                valueSpan.classList.remove("value_alert", "value_norm");

                if (value == "0") {
                    valueSpan.textContent = "False";
                    valueSpan.classList.add("value_alert");
                } else {
                    valueSpan.textContent = "True";
                    valueSpan.classList.add("value_norm");
                }
            }

            if (value == '- - - - >') {
                row = table.insertRow();
            }

            cell.appendChild(fieldkeySpan);
            cell.appendChild(document.createElement("br"));
            cell.appendChild(document.createElement("br"));
            cell.appendChild(valueSpan);

            cell.setAttribute("colspan", "2");
            cell.classList.add(CellType);
        });
    });

    tableDiv.appendChild(table);
}

// --------------------------------------------------
// DEVICE Auswahl
// --------------------------------------------------
function sendName(buttonId) {

    selectedDevice = buttonId;

    createTable();
}

// --------------------------------------------------
// Initialisierung
// --------------------------------------------------
// KEIN setInterval mehr!