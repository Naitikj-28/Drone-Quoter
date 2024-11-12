//-----------------------------------Map Section--------------------------------------------------//
const map = L.map('map-container').setView([23.5937, 80.9629], 4.5);

const world = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const googleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var OpenMap = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

//--------------------------------------------Map Filter-------------------------------------------//
const baseMaps = {
    "Google ": googleStreets,
    "Natural": world,
    "Road Map": OpenMap
};

const layerControl = L.control.layers(baseMaps).addTo(map);
googleStreets.addTo(map);

//-----------------------------------------Draw Polygon--------------------------------------------//

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

let drawControl;

function initDrawControl() {
    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        },
        draw: {
            polygon: {
                shapeOptions: {
                    color: 'blue',
                    fillColor: 'yellow',
                    fillOpacity: 0.5,
                    weight: 2
                },
                allowIntersection: false,
                drawError: {
                    color: 'red',
                    timeout: 7000
                },
                showArea: true,
                metric: false,
                repeatMode: true
            },
            polyline: false,
            rectangle: true,
            circle: false,
            marker: false
        }
    });
    map.addControl(drawControl);
}

function removeDrawControl() {
    if (drawControl) {
        map.removeControl(drawControl);
    }
}

//-----------------------------------Map drawing conveter in hectares-------------------------------//
map.on('draw:created', function (e) {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);

    const area = L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0]);
    const hectares = area / 10000;

    document.getElementById('hectares').value = hectares.toFixed(2);
    calculatePrice();
});

//--------------------------------------Price Calculator------------------------------------------//
const hectaresInput = document.getElementById('hectares');
const quotationElement = document.getElementById('quotation');
function calculatePrice() {

    const hectares = parseFloat(hectaresInput.value);

    if (isNaN(hectares) || hectares < 0) {
        return;
    }

    const a = 8800;
    const b = 8000;
    const hectareRanges = [
        { min: 0, max: 50, rate1: 1, rate2: 2, no: 2.5 },
        { min: 51, max: 60, rate1: 1, rate2: 2, no: 3 },
        { min: 61, max: 80, rate1: 1, rate2: 3, no: 4 },
        { min: 81, max: 100, rate1: 1, rate2: 3, no: 5 },
        { min: 101, max: 150, rate1: 2, rate2: 4, no: 7.5 },
        { min: 151, max: 200, rate1: 2, rate2: 5, no: 10 },
        { min: 201, max: 300, rate1: 2, rate2: 6, no: 15 },
        { min: 301, max: 500, rate1: 3, rate2: 8, no: 25 },
        { min: 501, max: 1001, rate1: 5, rate2: 10, no: 50 },
        { min: 1001, max: 2000, rate1: 10, rate2: 14, no: 100 },
        { min: 2001, max: 5000, rate1: 25, rate2: 16, no: 250 },
        { min: 5001, max: 10000, rate1: 50, rate2: 20, no: 500 },
        { min: 10001, max: 15000, rate1: 65, rate2: 30, no: 750 },
        { min: 15001, max: 20000, rate1: 80, rate2: 40, no: 1000 },
        { min: 20001, max: 25000, rate1: 82, rate2: 50, no: 1250 },
        { min: 25001, max: 95000, rate1: 100, rate2: 80, no: 1550 },
        { min: 95001, max: 50994771769, rate1: 150, rate2: 1000, no: 1750 },
    ];

    for (const range of hectareRanges) {
        if (hectares >= range.min && hectares <= range.max) {
            pricePerHectare = a * range.rate1 + b * range.rate2;
            break;
        }
    }

    let rate1 = 0;
    let rate2 = 0;
    let no = 0;

    for (const range of hectareRanges) {
        if (hectares >= range.min && hectares <= range.max) {
            rate1 = range.rate1;
            rate2 = range.rate2;
            no = range.no;
            break;
        }
    }
    document.getElementById("rate1").innerText = rate1;
    document.getElementById("rate2").innerText = rate2;
    document.getElementById("no").innerText = no;

    const totalPrice = pricePerHectare;

    quotationElement.textContent = `Quotation for ${hectares.toFixed(2)} hectares: Rs ${totalPrice.toFixed(2)}`;
}

//-----------------------------------Drawing Function Key ---------------------------------------//
function toggleDrawing() {
    const drawCheckbox = document.getElementById('drawCheckbox');

    if (drawCheckbox.checked) {
        initDrawControl();
        document.querySelector('.leaflet-draw-toolbar').style.display = 'block';
    } else {
        removeDrawControl();
        drawnItems.clearLayers();
        document.getElementById('hectares').value = "";
        calculatePrice();
        document.querySelector('.leaflet-draw-toolbar').style.display = 'none';
    }
}


//----------------------------------------------Second Part------------------------------------------------------------//
//---------------------------------------Upload KML------------------------------------------------//
function processKML() {
    const fileInput = document.getElementById('fileInput');

    if (fileInput.files.length === 0) {
        alert('Please select a KML file');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const kmlData = e.target.result;

        if (currentKMLLayer) {
            map.removeLayer(currentKMLLayer);
        }

        const newLayer = omnivore.kml.parse(kmlData);
        map.addLayer(newLayer);

        const area = L.GeometryUtil.geodesicArea(newLayer.getLayers()[0].getLatLngs()[0]);
        const hectares = area / 10000; // Convert square meters to hectares

        const bounds = newLayer.getBounds();
        map.fitBounds(bounds);

        document.getElementById('hectares').value = hectares.toFixed(2);
        calculatePrice();

        currentKMLLayer = newLayer;
    };
    reader.readAsText(file);
}
let currentKMLLayer;

//------------------------------------Third Part  --------------------------------------------------------//
//-------------------------------Export Kml file function------------------------------------//
function exportKML() {
    const kmlContent = generateKML();
    if (kmlContent) {  // Only proceed if there is valid KML content
        const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'exported_area.kml';
        link.click();
    } else {
        alert('No shapes to export. Please draw a shape first.');
    }
}

function generateKML() {
    const layers = drawnItems.getLayers();
    if (layers.length === 0) {
        return ''; // Return an empty string if no shapes are drawn
    }

    const kmlStart = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n' +
        '  <Document>\n';
    const kmlEnd = '  </Document>\n' +
        '</kml>';

    let kmlPlacemarks = '';

    layers.forEach(layer => {
        const coordinates = layer.getLatLngs()[0].map(latlng => `${latlng.lng},${latlng.lat}`).join(' ');
        const closedCoordinates = coordinates + ` ${layer.getLatLngs()[0][0].lng},${layer.getLatLngs()[0][0].lat}`;

        kmlPlacemarks += `    <Placemark>\n` +
            `      <Polygon>\n` +
            `        <outerBoundaryIs>\n` +
            `          <LinearRing>\n` +
            `            <coordinates>${closedCoordinates}</coordinates>\n` +
            `          </LinearRing>\n` +
            `        </outerBoundaryIs>\n` +
            `      </Polygon>\n` +
            `    </Placemark>\n`;
    });

    return kmlStart + kmlPlacemarks + kmlEnd;
}

//-------------------------------------------Fourth Part--------------------------------------------//
//=-----------------------------DGPS Price Addition in Calculation-----------------------------//
function Dgps() {
    let dgps = document.getElementById("dgps");
    let totalPrice = pricePerHectare;

    if (dgps.checked) {
        totalPrice += 15500;
    }

    quotationElement.textContent = `Quotation for ${hectaresInput.value} hectares: Rs ${totalPrice.toFixed(2)}`;

    return totalPrice;
}

