const cameraInput = document.querySelector("#camera-input");
const galleryInput = document.querySelector("#gallery-input");
const fileStatus = document.querySelector("#file-status");
const previewContainer = document.querySelector("#preview-container");
const imagePreview = document.querySelector("#image-preview");
const scanButton = document.querySelector("#scan-button");
const resultSection = document.querySelector("#result-section");
const ocrSummary = document.querySelector("#ocr-summary");
const latitudeInput = document.querySelector("#latitude");
const longitudeInput = document.querySelector("#longitude");
const validationMessage = document.querySelector("#validation-message");
const navigateButton = document.querySelector("#navigate-button");

let selectedImageUrl = "";

function setStatus(message) {
  fileStatus.textContent = message;
}

function normalizeCoordinate(value) {
  return Number.parseFloat(value.trim().replace(",", "."));
}

function validateCoordinates() {
  const latitude = normalizeCoordinate(latitudeInput.value);
  const longitude = normalizeCoordinate(longitudeInput.value);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { error: "Wpisz obie współrzędne w formacie dziesiętnym." };
  }

  if (latitude < -90 || latitude > 90) {
    return { error: "Szerokość geograficzna musi mieścić się od -90 do 90." };
  }

  if (longitude < -180 || longitude > 180) {
    return { error: "Długość geograficzna musi mieścić się od -180 do 180." };
  }

  return { latitude, longitude };
}

function extractCoordinates(text) {
  const normalizedText = text
    .replace(/[–—−]/g, "-")
    .replace(/(\d)[Oo](?=[\d.,])/g, (_, digit) => `${digit}0`)
    .replace(/(\d)[Il](?=[\d.,])/g, (_, digit) => `${digit}1`);
  const numbers = normalizedText.match(/-?\d{1,3}(?:[.,]\d+)?/g) ?? [];

  for (let index = 0; index < numbers.length - 1; index += 1) {
    const latitude = normalizeCoordinate(numbers[index]);
    const longitude = normalizeCoordinate(numbers[index + 1]);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

function showCoordinates(latitude, longitude, message) {
  latitudeInput.value = latitude;
  longitudeInput.value = longitude;
  ocrSummary.textContent = message;
  validationMessage.textContent = "";
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function handleImageSelection(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("Wybierz plik graficzny.");
    return;
  }

  if (selectedImageUrl) {
    URL.revokeObjectURL(selectedImageUrl);
  }

  selectedImageUrl = URL.createObjectURL(file);
  imagePreview.src = selectedImageUrl;
  previewContainer.hidden = false;
  resultSection.hidden = true;
  scanButton.disabled = false;
  setStatus(`Wybrano: ${file.name}. Możesz rozpocząć odczyt.`);
}

async function readCoordinates() {
  if (!selectedImageUrl) {
    return;
  }

  if (!window.Tesseract) {
    setStatus("Nie udało się załadować biblioteki OCR. Sprawdź połączenie z internetem.");
    return;
  }

  scanButton.disabled = true;
  setStatus("Odczytywanie tekstu ze zdjęcia…");

  try {
    const {
      data: { text },
    } = await Tesseract.recognize(selectedImageUrl, "eng+pol", {
      logger: ({ status, progress }) => {
        if (status === "recognizing text") {
          setStatus(`Odczytywanie tekstu: ${Math.round(progress * 100)}%`);
        }
      },
    });

    const coordinates = extractCoordinates(text);

    if (!coordinates) {
      showCoordinates(
        "",
        "",
        "Nie znaleziono współrzędnych automatycznie. Wpisz je ręcznie na podstawie zdjęcia."
      );
      setStatus("Odczyt zakończony. Współrzędne wymagają ręcznego wpisania.");
      return;
    }

    showCoordinates(
      coordinates.latitude,
      coordinates.longitude,
      "Znaleziono współrzędne. Sprawdź je przed nawigacją."
    );
    setStatus("Odczyt zakończony.");
  } catch (error) {
    console.error(error);
    setStatus("Nie udało się odczytać tekstu. Spróbuj wykonać wyraźniejsze zdjęcie.");
  } finally {
    scanButton.disabled = false;
  }
}

function startNavigation() {
  const result = validateCoordinates();

  if (result.error) {
    validationMessage.textContent = result.error;
    return;
  }

  validationMessage.textContent = "";
  const destination = `${result.latitude},${result.longitude}`;
  const mapsUrl = new URL("https://www.google.com/maps/dir/");
  mapsUrl.searchParams.set("api", "1");
  mapsUrl.searchParams.set("destination", destination);
  mapsUrl.searchParams.set("travelmode", "driving");
  window.location.assign(mapsUrl.toString());
}

cameraInput.addEventListener("change", handleImageSelection);
galleryInput.addEventListener("change", handleImageSelection);
scanButton.addEventListener("click", readCoordinates);
navigateButton.addEventListener("click", startNavigation);
