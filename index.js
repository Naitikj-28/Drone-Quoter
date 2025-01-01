//-----------------------------------------Map Renderation-------------------------------------------// 
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
        draw: {
            polygon: {
                shapeOptions: {
                    color: 'green',
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
        },
    });
    map.addControl(drawControl);
}

function removeDrawControl() {
    if (drawControl) {
        map.removeControl(drawControl);
    }
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
        document.querySelector('.leaflet-draw-toolbar').style.display = 'none';
    }
}

//-----------------------------------Map drawing converter in hectares-------------------------------//
map.on('draw:created', function (e) {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);

    const area = L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0]);
    hectaresValue = area / 10000;  // Update the hectaresValue

    document.getElementById('hectares').value = hectaresValue.toFixed(2);  // Display on the input
    isPriceCalculated = false;
});


//-----------------------------------Uploading KML file function--------------------------------
function triggerFileInput() {
    document.getElementById('fileInput').click();
}
function processKML(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const kmlText = e.target.result;
            try {
                if (window.mapLayer) {
                    map.removeLayer(window.mapLayer);
                }
                window.mapLayer = omnivore.kml.parse(kmlText).addTo(map);

                const bounds = window.mapLayer.getBounds();
                map.fitBounds(bounds);

                const firstLayer = window.mapLayer.getLayers()[0];
                if (firstLayer) {
                    const latlngs = firstLayer.getLatLngs();
                    const area = L.GeometryUtil.geodesicArea(latlngs[0]);
                    const hectares = area / 10000;

                    // Update hectares value in the input field
                    document.getElementById('hectares').value = hectares.toFixed(2);
                    hectaresValue = hectares; // Update global hectares value
                } else {
                    alert('No valid layer found in the KML file.');
                }

                window.currentKMLLayer = window.mapLayer;
            } catch (error) {
                console.error("Error processing KML:", error);
                alert('Error processing the KML file. Please check the file and try again.');
            }
        };
        reader.readAsText(file);
    } else {
        alert('No file selected.');
    }
}

//---------------------------Function to remove uploaded KML----------------------------------------
function removeUploadedKML() {
    if (window.mapLayer) {
        map.removeLayer(window.mapLayer);
        window.mapLayer = null;
    }
    document.getElementById('fileInput').value = '';

    document.getElementById('hectares').value = '';
    isPriceCalculated = false;
}

// ---------------------------Exporting KML ----------------------------------------//
function exportKML() {
    if (drawnItems.getLayers().length === 0) {
        alert('No area drawn to export.');
        return;
    }

    const layer = drawnItems.getLayers()[0];
    const coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
        <Placemark>
            <name>Drone Survey Area</name>
            <Polygon>
                <outerBoundaryIs>
                    <LinearRing>
                        <coordinates>${coordinates.map(coord => coord.join(',')).join(' ')}</coordinates>
                    </LinearRing>
                </outerBoundaryIs>
            </Polygon>
        </Placemark>
    </kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'drone-survey.kml';
    link.click();
}


//----------------------------Converter------------------------------------------- //
function convertUnitToHectare() {
    const hectaresInput = document.getElementById('hectares1');
    const unitSelect = document.getElementById('unitSelect');
    const inputValue = parseFloat(hectaresInput.value);
    let valueInHectares = 0;

    if (isNaN(inputValue) || inputValue < 0) {
        document.getElementById('convertedValue').textContent = "0.00";
        return;  // If input is invalid, return without converting
    }

    const selectedUnit = unitSelect.value;

    switch (selectedUnit) {
        case 'hectares':
            valueInHectares = inputValue;
            break;
        case 'sqm':
            valueInHectares = inputValue / 10000; // 1 hectare = 10,000 sqm
            break;
        case 'sqkm':
            valueInHectares = inputValue * 100; // 1 sq km = 100 hectares
            break;
        case 'acres':
            valueInHectares = inputValue * 0.404686; // 1 acre = 0.404686 hectares
            break;
        default:
            valueInHectares = 0;
    }

    document.getElementById('convertedValue').textContent = valueInHectares.toFixed(2);
    hectaresValue = valueInHectares;  // Update hectaresValue
}

document.getElementById('hectares1').addEventListener('input', convertUnitToHectare);
document.getElementById('unitSelect').addEventListener('change', convertUnitToHectare);

//--------------------------------------Price Calculator------------------------------------------//
const quotationElement = document.getElementById('quotation');
let isPriceCalculated = false;

function toWordsIndianCurrency(num) {
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ` ${a[n % 10]}` : '');
        if (n < 1000) return `${a[Math.floor(n / 100)]} hundred` + (n % 100 ? ` and ${numToWords(n % 100)}` : '');
        return '';
    }

    if (num === 0) return 'zero';

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = Math.floor((num % 1000) / 100);
    const remainder = num % 100;

    let words = '';

    if (crore) words += `${numToWords(crore)} Crore `;
    if (lakh) words += `${numToWords(lakh)} Lakh `;
    if (thousand) words += `${numToWords(thousand)} Thousand `;
    if (hundred) words += `${numToWords(hundred)} Hundred `;
    if (remainder) words += `${numToWords(remainder)}`;

    return words.trim();
}

let dgpsPrice = 0;  // Store DGPS price globally
let totalPriceWithDGPS = 0;  // Store total price including DGPS

function calculatePrice() {
    if (isNaN(hectaresValue) || hectaresValue < 0) {
        alert('Invalid hectares value. Please check and try again.');
        return;
    }

    const a = 8800;
    const b = 8000;
    const hectareRanges = [
        { min: 1, max: 50.9, rate1: 1, rate2: 2, no: 2.5 },
        { min: 51, max: 60.9, rate1: 1, rate2: 2, no: 3 },
        { min: 61, max: 80.9, rate1: 1, rate2: 3, no: 4 },
        { min: 81, max: 100.9, rate1: 1, rate2: 3, no: 5 },
        { min: 101, max: 150.9, rate1: 2, rate2: 4, no: 7.5 },
        { min: 151, max: 200.9, rate1: 2, rate2: 5, no: 10 },
        { min: 201, max: 300.9, rate1: 2, rate2: 6, no: 15 },
        { min: 301, max: 500.9, rate1: 3, rate2: 8, no: 25 },
        { min: 501, max: 1001.9, rate1: 5, rate2: 10, no: 50 },
        { min: 1001, max: 2000.9, rate1: 10, rate2: 14, no: 100 },
        { min: 2001, max: 5000.9, rate1: 25, rate2: 16, no: 250 },
        { min: 5001, max: 10000.9, rate1: 50, rate2: 20, no: 500 },
        { min: 10001, max: 15000.9, rate1: 65, rate2: 30, no: 750 },
        { min: 15001, max: 20000.9, rate1: 80, rate2: 40, no: 1000 },
        { min: 20001, max: 25000.9, rate1: 82, rate2: 50, no: 1250 },
        { min: 25001, max: 95000.9, rate1: 100, rate2: 80, no: 1550 },
        { min: 95001, max: 50994771769.9, rate1: 150, rate2: 1000, no: 1750 },
    ];

    let pricePerHectare = 0;
    let rate1 = 0, rate2 = 0, no = 0;

    for (const range of hectareRanges) {
        if (hectaresValue >= range.min && hectaresValue <= range.max + 0.01) {
            pricePerHectare = a * range.rate1 + b * range.rate2;
            rate1 = range.rate1;
            rate2 = range.rate2;
            no = range.no;
            break;
        }
    }

    document.getElementById("rate1").innerText = rate1;
    document.getElementById("rate2").innerText = rate2;
    document.getElementById("no").innerText = no;

    const baseTotalPrice = pricePerHectare;
    totalPriceWithDGPS = baseTotalPrice;

    // Check if DGPS is checked and apply or remove its price
    if (document.getElementById("dgps").checked) {
        dgpsPrice = calculateDGPSPrice();
        totalPriceWithDGPS += dgpsPrice;
    } else {
        dgpsPrice = 0;  // If DGPS is unchecked, reset its price
    }

    const totalPriceInWords = toWordsIndianCurrency(Math.round(totalPriceWithDGPS));

    isPriceCalculated = true;
    quotationElement.innerHTML = `Quotation for ${hectaresValue.toFixed(2)} hectares: Rs ${totalPriceWithDGPS.toFixed(2)}<br>(Rupees ${totalPriceInWords})`;
}

function Dgps() {
    if (!isPriceCalculated) {
        alert('Please calculate the price first.');
        return;
    }

    let dgpsChecked = document.getElementById("dgps").checked;
    if (dgpsChecked) {
        dgpsPrice = calculateDGPSPrice();
        totalPriceWithDGPS += dgpsPrice;
    } else {
        totalPriceWithDGPS -= dgpsPrice;
        dgpsPrice = 0;
    }

    const totalPriceInWords = toWordsIndianCurrency(Math.round(totalPriceWithDGPS));
    quotationElement.innerHTML = `Quotation for ${hectaresValue.toFixed(2)} hectares: Rs ${totalPriceWithDGPS.toFixed(2)}<br>(Rupees ${totalPriceInWords})`;
}

function calculateDGPSPrice() {
    const dgpsPriceRanges = [
        { min: 0, max: 50.9, dgpsPrice: 15500 },
        { min: 51, max: 60.9, dgpsPrice: 16500 },
        { min: 61, max: 80.9, dgpsPrice: 18000 },
        { min: 81, max: 100.9, dgpsPrice: 20000 },
        { min: 101, max: 150.9, dgpsPrice: 22500 },
        { min: 151, max: 200.9, dgpsPrice: 25000 },
        { min: 201, max: 300.9, dgpsPrice: 27500 },
        { min: 301, max: 500.9, dgpsPrice: 30000 },
        { min: 501, max: 1001.9, dgpsPrice: 35500 },
        { min: 1001, max: 2000.9, dgpsPrice: 40000 },
        { min: 2001, max: 5000.9, dgpsPrice: 44500 },
        { min: 5001, max: 10000.9, dgpsPrice: 46700 },
        { min: 10001, max: 15000.9, dgpsPrice: 48500 },
        { min: 15001, max: 20000.9, dgpsPrice: 50000 },
        { min: 20001, max: 25000.9, dgpsPrice: 66000 },
        { min: 25001, max: 95000.9, dgpsPrice: 100000 },
        { min: 95001, max: 50994771769.9, dgpsPrice: 150000 }
    ];

    let dgpsPrice = 0;

    for (const range of dgpsPriceRanges) {
        if (hectaresValue >= range.min && hectaresValue <= range.max) {
            dgpsPrice = range.dgpsPrice;
            break;
        }
    }

    return dgpsPrice;
}

document.getElementById("cp").addEventListener("click", function () {
    isPriceCalculated = true;
    document.getElementById("dgps").disabled = false;
});

// --------------------------Refresh Page Function---------------------------------//
function clearAll() {
    // Reset all input fields
    document.getElementById('fileInput').value = '';
    document.getElementById('hectares').value = '';
    document.getElementById('hectares1').value = '';
    document.getElementById('unitSelect').value = 'hectares';
    document.getElementById('drawCheckbox').checked = false;
    document.getElementById('dgps').checked = false;
    document.getElementById('quotation').textContent = 'Quotation: Rs 0.00';
    document.getElementById('rate1').textContent = '0';
    document.getElementById('rate2').textContent = '0';
    document.getElementById('no').textContent = '0';
    document.getElementById('convertedValue').textContent = '0.00';

    if (map) {
        map.eachLayer(function (layer) {
            if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
    }
    hectaresValue = 0;
    dgpsPrice = 0;
    totalPriceWithDGPS = 0;
    isPriceCalculated = false;
    document.getElementById("dgps").disabled = true;
    document.getElementById("dgps").checked = false;
}
