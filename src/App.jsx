import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

const sections = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    kicker: 'Start here',
    title: 'Begin with a clear path into biodiversity data and tools.',
    summary: 'This section is driven by an editable markdown article stored inside the repo.',
    bullets: ['Editable markdown', 'Article onboarding', 'Simple to maintain'],
    accent: 'Orientation',
  },
  {
    id: 'home',
    label: 'Home',
    kicker: 'Platform home',
    title: 'A clean space for the latest runs, datasets, and outputs.',
    summary: 'Reserved for the most recent activity across the platform.',
    bullets: ['Latest data', 'Recent outputs', 'Next actions'],
    accent: 'Home Base',
  },
  {
    id: 'data',
    label: 'Data',
    kicker: 'Connected data',
    title: 'Import, upload, manage, and inspect biodiversity and climate-ready datasets.',
    summary: 'Search live records, browse local files, manage My Data, and preview datasets in table or map view.',
    bullets: ['GBIF and iNaturalist', 'Upload CSV, TIFF, SHP', 'All Data and My Data'],
    accent: 'Data Store',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    kicker: 'Prepare and process',
    title: 'Select a dataset and send it through the next tools.',
    summary: 'Choose imported or uploaded data, review the recommended tools, and generate outputs for Insight.',
    bullets: ['Dataset picker', 'Suggested tools', 'Output generation'],
    accent: 'Analysis Lab',
  },
  {
    id: 'insight',
    label: 'Insight',
    kicker: 'Ecological outputs',
    title: 'Review outputs with inference and data story framing.',
    summary: 'Analysis results appear here with concise interpretation and narrative context.',
    bullets: ['Outputs list', 'Inference', 'Data story'],
    accent: 'Insight Layer',
  },
  {
    id: 'attribution',
    label: 'Attribution',
    kicker: 'Cite responsibly',
    title: 'Track platform attribution, provenance, and the software stack.',
    summary: 'This page records how to cite the platform and which packages and tools are being used to build it.',
    bullets: ['Package versions', 'Software versions', 'FAIR-aware citation'],
    accent: 'Attribution',
  },
];

const overviewCards = [
  { value: '6', label: 'Top-level tabs' },
  { value: 'WGS84', label: 'Spatial default' },
  { value: 'FAIR', label: 'Attribution focus' },
];

const packageVersions = [
  { name: 'React', version: '^18.3.1', kind: 'dependency' },
  { name: 'React DOM', version: '^18.3.1', kind: 'dependency' },
  { name: 'Leaflet', version: '^1.9.4', kind: 'dependency' },
  { name: 'React Leaflet', version: '^4.2.1', kind: 'dependency' },
  { name: 'React Markdown', version: '^10.1.0', kind: 'dependency' },
  { name: 'Vite', version: '^5.4.10', kind: 'devDependency' },
  { name: '@vitejs/plugin-react', version: '^4.3.4', kind: 'devDependency' },
];

const softwareVersions = [
  { name: 'App', version: '0.1.0' },
  { name: 'Module format', version: 'ES Modules' },
  { name: 'Map tiles', version: 'OpenStreetMap' },
  { name: 'Markdown source', version: 'public/getting-started.md' },
];

const starterDatasets = [
  {
    id: 'seed-1',
    name: 'India Mammal Atlas',
    source: 'BBI curated',
    scope: 'All Data',
    type: 'Occurrence',
    count: 1240,
    owner: 'Public',
    records: [
      { key: 'a1', species: 'Panthera tigris', lat: 26.8467, lng: 80.9462, status: 'Verified' },
      { key: 'a2', species: 'Elephas maximus', lat: 11.1271, lng: 78.6569, status: 'Verified' },
      { key: 'a3', species: 'Axis axis', lat: 22.9734, lng: 78.6569, status: 'Ready' },
    ],
  },
];

const climateCatalog = [
  {
    id: 'climate-1',
    title: 'India temperature normals raster pack',
    source: 'data.gov.in connector-ready',
    summary: 'Prepared raster pack for long-term monthly temperature normals.',
    resolution: '1 km',
  },
  {
    id: 'climate-2',
    title: 'India rainfall climatology surfaces',
    source: 'data.gov.in connector-ready',
    summary: 'Prepared rainfall layers for climate and ecological suitability workflows.',
    resolution: '5 km',
  },
  {
    id: 'climate-3',
    title: 'Bioclim starter bundle',
    source: 'Bioclim library',
    summary: 'Placeholder bundle for bioclimatic variables used in species distribution analysis.',
    resolution: '30 arc-sec',
  },
];

const gbifCountries = [
  { value: 'IN', label: 'India' },
  { value: 'NP', label: 'Nepal' },
  { value: 'BT', label: 'Bhutan' },
  { value: 'LK', label: 'Sri Lanka' },
];

const basisOptions = ['ALL', 'HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE'];

const indiaBounds = {
  nelat: 37.6,
  nelng: 97.25,
  swlat: 6.45,
  swlng: 68.1,
};

const progressSteps = [
  { value: 20, label: 'Search' },
  { value: 45, label: 'Select' },
  { value: 75, label: 'Fetch' },
  { value: 100, label: 'Import' },
];

function buildProgress(stage, percent, message) {
  return { stage, percent, message };
}

function toDatasetRecord(record, fallbackName) {
  return {
    key: String(record.key ?? `${fallbackName}-${Math.random()}`),
    species: record.species || record.name || record.taxon?.name || fallbackName || 'Unknown species',
    lat: record.decimalLatitude ?? record.geojson?.coordinates?.[1] ?? record.location?.split(',')[0] ?? null,
    lng: record.decimalLongitude ?? record.geojson?.coordinates?.[0] ?? record.location?.split(',')[1] ?? null,
    status: record.occurrenceStatus || record.quality_grade || 'Imported',
  };
}

function buildImportedDataset({ name, source, records, sourceId, type = 'Occurrence', metadata = {} }) {
  const cleanRecords = records
    .map((record) => toDatasetRecord(record, name))
    .filter((record) => Number.isFinite(Number(record.lat)) && Number.isFinite(Number(record.lng)))
    .map((record) => ({
      ...record,
      lat: Number(record.lat),
      lng: Number(record.lng),
    }));

  return {
    id: `${sourceId}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    name,
    source,
    scope: 'My Data',
    type,
    count: cleanRecords.length,
    owner: 'My Data',
    importedAt: new Date().toISOString(),
    metadata,
    records: cleanRecords,
  };
}

function parseCsvText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].split(',').map((header) => header.trim());
  const latIndex = headers.findIndex((header) => ['lat', 'latitude', 'decimalLatitude'].includes(header));
  const lngIndex = headers.findIndex((header) => ['lng', 'lon', 'longitude', 'decimalLongitude'].includes(header));
  const speciesIndex = headers.findIndex((header) => ['species', 'scientificName', 'name'].includes(header));

  const records = rows.slice(1).map((row, index) => {
    const values = row.split(',').map((value) => value.trim());
    return {
      key: `csv-${index + 1}`,
      species: values[speciesIndex] || `Record ${index + 1}`,
      lat: Number(values[latIndex]),
      lng: Number(values[lngIndex]),
      status: 'Uploaded',
    };
  });

  return {
    headers,
    records: records.filter((record) => Number.isFinite(record.lat) && Number.isFinite(record.lng)),
  };
}

function MapActions({ records }) {
  const map = useMap();

  function fitToData() {
    const valid = records.filter((record) => Number.isFinite(record.lat) && Number.isFinite(record.lng));
    if (!valid.length) {
      map.setView([22.5937, 78.9629], 4);
      return;
    }

    const bounds = latLngBounds(valid.map((record) => [record.lat, record.lng]));
    map.fitBounds(bounds, { padding: [24, 24] });
  }

  return (
    <div className="map-tools">
      <button type="button" className="map-tool" onClick={() => map.zoomIn()}>
        Zoom in
      </button>
      <button type="button" className="map-tool" onClick={() => map.zoomOut()}>
        Zoom out
      </button>
      <button type="button" className="map-tool" onClick={fitToData}>
        Fit data
      </button>
      <button type="button" className="map-tool" onClick={() => map.setView([22.5937, 78.9629], 4)}>
        Reset
      </button>
    </div>
  );
}

function DatasetMap({ records }) {
  const validRecords = records.filter((record) => Number.isFinite(record.lat) && Number.isFinite(record.lng));
  const center = validRecords.length ? [validRecords[0].lat, validRecords[0].lng] : [22.5937, 78.9629];

  return (
    <div className="map-shell">
      <MapContainer center={center} zoom={4} scrollWheelZoom className="leaflet-map">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {validRecords.map((record) => (
          <CircleMarker
            key={record.key}
            center={[record.lat, record.lng]}
            radius={7}
            pathOptions={{ color: '#9d5f17', fillColor: '#b96d1b', fillOpacity: 0.75 }}
          >
            <Popup>
              <strong>{record.species}</strong>
              <br />
              {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
            </Popup>
          </CircleMarker>
        ))}
        <MapActions records={validRecords} />
      </MapContainer>
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [gettingStartedMarkdown, setGettingStartedMarkdown] = useState('');
  const [dataMode, setDataMode] = useState('import');
  const [importSource, setImportSource] = useState('gbif');
  const [dataView, setDataView] = useState('table');
  const [libraryView, setLibraryView] = useState('all');

  const [gbifQuery, setGbifQuery] = useState('Panthera tigris');
  const [gbifSpeciesResults, setGbifSpeciesResults] = useState([]);
  const [selectedGbifSpecies, setSelectedGbifSpecies] = useState(null);
  const [gbifFilters, setGbifFilters] = useState({ country: 'IN', limit: 20, hasCoordinate: true, basisOfRecord: 'ALL' });
  const [gbifRecords, setGbifRecords] = useState([]);

  const [inatQuery, setInatQuery] = useState('Panthera tigris');
  const [inatTaxaResults, setInatTaxaResults] = useState([]);
  const [selectedInatTaxon, setSelectedInatTaxon] = useState(null);
  const [inatLimit, setInatLimit] = useState(20);
  const [inatRecords, setInatRecords] = useState([]);

  const [climateQuery, setClimateQuery] = useState('bioclim');
  const [climateResults, setClimateResults] = useState(climateCatalog);

  const [progress, setProgress] = useState(buildProgress('idle', 0, 'Choose a source and start an import.'));
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sourceError, setSourceError] = useState('');

  const [myDatasets, setMyDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(starterDatasets[0].id);
  const [analysisDatasetId, setAnalysisDatasetId] = useState('');
  const [analysisOutputs, setAnalysisOutputs] = useState([]);

  const currentSection = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[1],
    [activeSection],
  );

  const allDatasets = useMemo(() => [...starterDatasets, ...myDatasets], [myDatasets]);
  const visibleDatasets = useMemo(() => (libraryView === 'my' ? myDatasets : allDatasets), [allDatasets, libraryView, myDatasets]);
  const selectedDataset = useMemo(
    () =>
      visibleDatasets.find((dataset) => dataset.id === selectedDatasetId)
      || allDatasets.find((dataset) => dataset.id === selectedDatasetId)
      || visibleDatasets[0]
      || allDatasets[0]
      || null,
    [allDatasets, selectedDatasetId, visibleDatasets],
  );
  const previewRecords = useMemo(() => (selectedDataset?.records || []).slice(0, 50), [selectedDataset]);
  const analysisDataset = useMemo(
    () => myDatasets.find((dataset) => dataset.id === analysisDatasetId) || myDatasets[0] || null,
    [analysisDatasetId, myDatasets],
  );

  useEffect(() => {
    fetch('/getting-started.md')
      .then((response) => response.text())
      .then((text) => setGettingStartedMarkdown(text))
      .catch(() => {
        setGettingStartedMarkdown('# Getting Started\n\nEdit `/Users/abhirsc/Documents/GIT/demo_ui/public/getting-started.md` in VS Code.');
      });
  }, []);

  useEffect(() => {
    if (visibleDatasets.length && !visibleDatasets.some((dataset) => dataset.id === selectedDatasetId)) {
      setSelectedDatasetId(visibleDatasets[0].id);
    }
  }, [selectedDatasetId, visibleDatasets]);

  useEffect(() => {
    if (myDatasets.length && !myDatasets.some((dataset) => dataset.id === analysisDatasetId)) {
      setAnalysisDatasetId(myDatasets[0].id);
    }
  }, [analysisDatasetId, myDatasets]);

  async function searchGbifSpecies() {
    if (!gbifQuery.trim()) {
      setSourceError('Enter a species name to search GBIF.');
      return;
    }

    setSourceError('');
    setFeedbackMessage('');
    setProgress(buildProgress('searching', 20, 'Searching GBIF species suggestions...'));

    try {
      const response = await fetch(`https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(gbifQuery.trim())}&limit=6`);
      if (!response.ok) throw new Error('GBIF species search failed.');
      const data = await response.json();
      setGbifSpeciesResults(data);
      setSelectedGbifSpecies(data[0] ?? null);
      setProgress(buildProgress('select', 45, `Fetched ${data.length} GBIF species matches successfully.`));
      setFeedbackMessage('Species fetched successfully. Select a species and fetch records.');
    } catch (error) {
      setSourceError(error.message || 'Unable to search GBIF right now.');
      setProgress(buildProgress('error', 0, 'GBIF search failed.'));
    }
  }

  async function fetchGbifRecords() {
    if (!selectedGbifSpecies?.key) {
      setSourceError('Select a GBIF species result first.');
      return;
    }

    setSourceError('');
    setFeedbackMessage('');
    setProgress(buildProgress('fetching', 75, 'Fetching filtered GBIF occurrence records...'));

    try {
      const params = new URLSearchParams({ limit: String(gbifFilters.limit), speciesKey: String(selectedGbifSpecies.key) });
      if (gbifFilters.country) params.set('country', gbifFilters.country);
      if (gbifFilters.hasCoordinate) params.set('hasCoordinate', 'true');
      if (gbifFilters.basisOfRecord !== 'ALL') params.set('basisOfRecord', gbifFilters.basisOfRecord);

      const response = await fetch(`https://api.gbif.org/v1/occurrence/search?${params.toString()}`);
      if (!response.ok) throw new Error('GBIF record search failed.');
      const data = await response.json();
      const results = (data.results || []).filter(
        (record) => typeof record.decimalLatitude === 'number' && typeof record.decimalLongitude === 'number',
      );
      setGbifRecords(results);
      setProgress(buildProgress('ready', 82, `Fetched ${results.length} GBIF records successfully.`));
      setFeedbackMessage('Fetch done successfully. Review the results and import to My Data.');
    } catch (error) {
      setSourceError(error.message || 'Unable to fetch GBIF records right now.');
      setProgress(buildProgress('error', 0, 'GBIF record fetch failed.'));
    }
  }

  async function searchInatTaxa() {
    if (!inatQuery.trim()) {
      setSourceError('Enter a species name to search iNaturalist.');
      return;
    }

    setSourceError('');
    setFeedbackMessage('');
    setProgress(buildProgress('searching', 20, 'Searching iNaturalist taxa...'));

    try {
      const response = await fetch(`https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(inatQuery.trim())}&per_page=6`);
      if (!response.ok) throw new Error('iNaturalist taxon search failed.');
      const data = await response.json();
      setInatTaxaResults(data.results || []);
      setSelectedInatTaxon(data.results?.[0] ?? null);
      setProgress(buildProgress('select', 45, `Fetched ${(data.results || []).length} iNaturalist matches successfully.`));
      setFeedbackMessage('Taxa fetched successfully. Select a taxon and fetch observations.');
    } catch (error) {
      setSourceError(error.message || 'Unable to search iNaturalist right now.');
      setProgress(buildProgress('error', 0, 'iNaturalist taxon search failed.'));
    }
  }

  async function fetchInatRecords() {
    if (!selectedInatTaxon?.id) {
      setSourceError('Select an iNaturalist taxon first.');
      return;
    }

    setSourceError('');
    setFeedbackMessage('');
    setProgress(buildProgress('fetching', 75, 'Fetching iNaturalist observations...'));

    try {
      const params = new URLSearchParams({
        taxon_id: String(selectedInatTaxon.id),
        per_page: String(inatLimit),
        geo: 'true',
        nelat: String(indiaBounds.nelat),
        nelng: String(indiaBounds.nelng),
        swlat: String(indiaBounds.swlat),
        swlng: String(indiaBounds.swlng),
      });
      const response = await fetch(`https://api.inaturalist.org/v1/observations?${params.toString()}`);
      if (!response.ok) throw new Error('iNaturalist observation search failed.');
      const data = await response.json();
      const results = (data.results || []).filter((record) => Array.isArray(record.geojson?.coordinates));
      setInatRecords(results);
      setProgress(buildProgress('ready', 82, `Fetched ${results.length} iNaturalist observations successfully.`));
      setFeedbackMessage('Fetch done successfully. Review the results and import to My Data.');
    } catch (error) {
      setSourceError(error.message || 'Unable to fetch iNaturalist observations right now.');
      setProgress(buildProgress('error', 0, 'iNaturalist observation fetch failed.'));
    }
  }

  function importCurrentRecords() {
    let dataset;

    if (importSource === 'gbif') {
      if (!selectedGbifSpecies || !gbifRecords.length) {
        setSourceError('Fetch GBIF records before importing them.');
        return;
      }
      dataset = buildImportedDataset({
        name: `${selectedGbifSpecies.canonicalName || selectedGbifSpecies.scientificName} GBIF import`,
        source: 'GBIF API',
        records: gbifRecords,
        sourceId: 'gbif',
      });
    }

    if (importSource === 'inat') {
      if (!selectedInatTaxon || !inatRecords.length) {
        setSourceError('Fetch iNaturalist observations before importing them.');
        return;
      }
      dataset = buildImportedDataset({
        name: `${selectedInatTaxon.name} iNaturalist import`,
        source: 'iNaturalist API',
        records: inatRecords,
        sourceId: 'inat',
      });
    }

    if (!dataset) return;

    setMyDatasets((current) => [dataset, ...current]);
    setLibraryView('my');
    setSelectedDatasetId(dataset.id);
    setAnalysisDatasetId(dataset.id);
    setDataView('table');
    setSourceError('');
    setProgress(buildProgress('imported', 100, `Import complete. ${dataset.count} records added to My Data.`));
    setFeedbackMessage('Import done successfully. The dataset is now available in My Data and Analysis.');
  }

  function searchClimateCatalog() {
    const query = climateQuery.trim().toLowerCase();
    const results = climateCatalog.filter((item) => !query || `${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(query));
    setClimateResults(results);
    setProgress(buildProgress('searching', 45, `Found ${results.length} prepared climate raster matches.`));
    setFeedbackMessage('Climate raster catalog updated. Next step is wiring a direct keyed connector.');
    setSourceError('');
  }

  async function handleUpload(kind, filesList) {
    const files = Array.from(filesList || []);
    if (!files.length) return;

    setSourceError('');
    setFeedbackMessage('');
    setProgress(buildProgress('uploading', 60, `Uploading ${files.length} file(s)...`));

    try {
      const uploadedDatasets = await Promise.all(
        files.map(async (file) => {
          if (kind === 'csv') {
            const text = await file.text();
            const parsed = parseCsvText(text);
            return buildImportedDataset({
              name: file.name,
              source: 'Local CSV upload',
              records: parsed.records,
              sourceId: 'upload-csv',
              type: 'CSV',
              metadata: { headers: parsed.headers.join(', ') },
            });
          }

          const type = kind === 'raster' ? 'Raster' : 'Shapefile';
          return buildImportedDataset({
            name: file.name,
            source: kind === 'raster' ? 'Local raster upload' : 'Local shapefile upload',
            records: [],
            sourceId: kind === 'raster' ? 'upload-raster' : 'upload-shp',
            type,
            metadata: { fileName: file.name, fileSize: `${Math.round(file.size / 1024)} KB` },
          });
        }),
      );

      setMyDatasets((current) => [...uploadedDatasets, ...current]);
      setLibraryView('my');
      setSelectedDatasetId(uploadedDatasets[0].id);
      setAnalysisDatasetId(uploadedDatasets[0].id);
      setProgress(buildProgress('uploaded', 100, `${uploadedDatasets.length} file(s) uploaded successfully.`));
      setFeedbackMessage('Upload complete. The new dataset is available in My Data and Analysis.');
    } catch (error) {
      setSourceError(error.message || 'Upload failed.');
      setProgress(buildProgress('error', 0, 'Upload failed.'));
    }
  }

  function deleteSelectedDataset() {
    if (!selectedDataset || selectedDataset.owner !== 'My Data') return;

    setMyDatasets((current) => current.filter((dataset) => dataset.id !== selectedDataset.id));
    setAnalysisOutputs((current) => current.filter((output) => output.datasetId !== selectedDataset.id));
    setFeedbackMessage(`Deleted ${selectedDataset.name} from My Data.`);
    setProgress(buildProgress('deleted', 0, 'Dataset removed from My Data.'));
  }

  function downloadSelectedDataset() {
    if (!selectedDataset) return;

    const rows = selectedDataset.records.length
      ? [
          ['species', 'latitude', 'longitude', 'status'],
          ...selectedDataset.records.map((record) => [
            record.species ?? '',
            record.lat ?? '',
            record.lng ?? '',
            record.status ?? '',
          ]),
        ]
      : [
          ['name', 'source', 'type', 'count', 'metadata'],
          [
            selectedDataset.name,
            selectedDataset.source,
            selectedDataset.type,
            selectedDataset.count,
            JSON.stringify(selectedDataset.metadata || {}),
          ],
        ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDataset.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedbackMessage(`Downloaded ${selectedDataset.name} as CSV.`);
  }

  function runAnalysis(toolName) {
    if (!analysisDataset) return;

    const uniqueSpecies = new Set((analysisDataset.records || []).map((record) => record.species)).size;
    const validCoords = (analysisDataset.records || []).filter(
      (record) => Number.isFinite(record.lat) && Number.isFinite(record.lng),
    );
    const meanLatitude = validCoords.length
      ? validCoords.reduce((sum, record) => sum + record.lat, 0) / validCoords.length
      : null;
    const meanLongitude = validCoords.length
      ? validCoords.reduce((sum, record) => sum + record.lng, 0) / validCoords.length
      : null;
    const meanSummary =
      meanLatitude !== null && meanLongitude !== null
        ? `Mean coordinate is ${meanLatitude.toFixed(4)}, ${meanLongitude.toFixed(4)}.`
        : 'Mean coordinate could not be calculated because the dataset has no valid mapped records.';

    const output = {
      id: `output-${Date.now()}`,
      datasetId: analysisDataset.id,
      datasetName: analysisDataset.name,
      toolName,
      summary: `${toolName} prepared on ${analysisDataset.name}.`,
      inference:
        analysisDataset.records.length > 0
          ? `The dataset contains ${analysisDataset.records.length} mapped records across ${uniqueSpecies} unique taxa-ready names.`
          : `This dataset is currently metadata-first and may need spatial or tabular enrichment before biodiversity inference.`,
      story:
        analysisDataset.records.length > 0
          ? `This run suggests ${analysisDataset.name} is ready for early biodiversity storytelling and exploratory interpretation.`
          : `This run suggests ${analysisDataset.name} is present in the workspace but still needs further preparation before story generation.`,
      metric: toolName === 'Calculate mean coordinate' ? meanSummary : null,
    };

    setAnalysisOutputs((current) => [output, ...current]);
    setActiveSection('insight');
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="page">
        <header className="topbar">
          <div className="brand-lockup">
            <img className="brand-logo" src="/logo.png" alt="Bharat Biodiversity Intelligence logo" />
            <div>
              <p className="brand-name">Bharat Biodiversity Intelligence</p>
              <span className="brand-subtitle">Data, analysis, insight, and attribution</span>
            </div>
          </div>
          <a className="contact-link" href="mailto:bharatbiodiversityintelligence@gmail.com">
            bharatbiodiversityintelligence@gmail.com
          </a>
        </header>

        <nav className="nav-shell" aria-label="Primary">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === currentSection.id ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <section className="hero-panel">
          <div className="hero-copy">
            <span className="hero-kicker">{currentSection.kicker}</span>
            <h1>{currentSection.title}</h1>
            <p className="hero-text">{currentSection.summary}</p>
            <div className="bullet-row">
              {currentSection.bullets.map((item) => (
                <span key={item} className="bullet-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <aside className="hero-side">
            <div className="focus-card">
              <span className="card-kicker">{currentSection.accent}</span>
              <strong>{currentSection.label}</strong>
              <p>Designed as a clear entry point with room for real workflows in the next pass.</p>
            </div>
            <div className="overview-grid">
              {overviewCards.map((card) => (
                <article key={card.label} className="mini-stat">
                  <span>{card.value}</span>
                  <p>{card.label}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="content-shell">
          <div className="section-head">
            <div>
              <span className="section-tag">Active section</span>
              <h2>{currentSection.label}</h2>
            </div>
            <p>A more precise workspace flow with stronger spacing, clearer actions, and handoff between modules.</p>
          </div>

          {currentSection.id === 'getting-started' ? (
            <>
              <div className="info-banner">
                Edit the article here:
                <code>/Users/abhirsc/Documents/GIT/demo_ui/public/getting-started.md</code>
              </div>
              <article className="markdown-article">
                <ReactMarkdown>{gettingStartedMarkdown}</ReactMarkdown>
              </article>
            </>
          ) : null}

          {currentSection.id === 'home' ? (
            <div className="empty-home">
              <strong>Latest data and outputs will appear here.</strong>
              <p>This space is intentionally kept empty for now so we can place recent runs and featured results next.</p>
            </div>
          ) : null}

          {currentSection.id === 'data' ? (
            <div className="data-shell">
              <div className="subtab-row" role="tablist" aria-label="Data input modes">
                <button type="button" className={dataMode === 'import' ? 'subtab active' : 'subtab'} onClick={() => setDataMode('import')}>
                  Import
                </button>
                <button type="button" className={dataMode === 'upload' ? 'subtab active' : 'subtab'} onClick={() => setDataMode('upload')}>
                  Upload
                </button>
              </div>

              {dataMode === 'import' ? (
                <>
                  <div className="subtab-row source-tabs" role="tablist" aria-label="Import sources">
                    <button type="button" className={importSource === 'gbif' ? 'subtab active' : 'subtab'} onClick={() => setImportSource('gbif')}>
                      GBIF
                    </button>
                    <button type="button" className={importSource === 'inat' ? 'subtab active' : 'subtab'} onClick={() => setImportSource('inat')}>
                      iNaturalist
                    </button>
                    <button type="button" className={importSource === 'climate' ? 'subtab active' : 'subtab'} onClick={() => setImportSource('climate')}>
                      data.gov.in / Bioclim
                    </button>
                  </div>

                  <div className="progress-card">
                    <div className="progress-meta">
                      <strong>{progress.stage === 'idle' ? 'Ready' : progress.stage}</strong>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="progress-track">
                      <span className="progress-fill" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <div className="progress-checkpoints">
                      {progressSteps.map((step) => (
                        <div key={step.label} className={progress.percent >= step.value ? 'checkpoint active' : 'checkpoint'}>
                          <span />
                          <small>{step.label}</small>
                        </div>
                      ))}
                    </div>
                    <p>{progress.message}</p>
                    {feedbackMessage ? <p className="success-text">{feedbackMessage}</p> : null}
                    {sourceError ? <p className="error-text">{sourceError}</p> : null}
                  </div>

                  {importSource === 'gbif' ? (
                    <div className="data-grid data-grid-wide">
                      <article className="feature-tile feature-panel import-panel">
                        <span className="section-tag">GBIF import</span>
                        <h3>Search species and fetch occurrence records</h3>
                        <p>Search GBIF by species name, apply filters, then import records into My Data.</p>
                        <div className="form-stack">
                          <label className="field-block">
                            <span>Species name</span>
                            <input className="text-input" value={gbifQuery} onChange={(event) => setGbifQuery(event.target.value)} placeholder="Panthera tigris" />
                          </label>
                          <button type="button" className="primary-button" onClick={searchGbifSpecies}>
                            Search GBIF
                          </button>
                          <div className="species-results">
                            {gbifSpeciesResults.map((species) => (
                              <button
                                key={species.key}
                                type="button"
                                className={selectedGbifSpecies?.key === species.key ? 'species-card active' : 'species-card'}
                                onClick={() => setSelectedGbifSpecies(species)}
                              >
                                <strong>{species.canonicalName || species.scientificName}</strong>
                                <span>{species.rank || 'Rank unknown'}</span>
                                <span>GBIF key: {species.key}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>

                      <article className="workspace-card import-workspace">
                        <div className="workspace-head">
                          <div>
                            <span className="section-tag">Filters</span>
                            <h3>Prepare the GBIF fetch</h3>
                          </div>
                        </div>
                        <div className="filter-grid">
                          <label className="field-block">
                            <span>Country</span>
                            <select className="text-input" value={gbifFilters.country} onChange={(event) => setGbifFilters((current) => ({ ...current, country: event.target.value }))}>
                              {gbifCountries.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field-block">
                            <span>Record limit</span>
                            <select className="text-input" value={gbifFilters.limit} onChange={(event) => setGbifFilters((current) => ({ ...current, limit: Number(event.target.value) }))}>
                              {[10, 20, 50, 100].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field-block">
                            <span>Basis of record</span>
                            <select className="text-input" value={gbifFilters.basisOfRecord} onChange={(event) => setGbifFilters((current) => ({ ...current, basisOfRecord: event.target.value }))}>
                              {basisOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="checkbox-field">
                            <input type="checkbox" checked={gbifFilters.hasCoordinate} onChange={(event) => setGbifFilters((current) => ({ ...current, hasCoordinate: event.target.checked }))} />
                            <span>Only records with coordinates</span>
                          </label>
                        </div>
                        <div className="button-row">
                          <button type="button" className="secondary-button" onClick={fetchGbifRecords}>
                            Fetch records
                          </button>
                          <button type="button" className="primary-button" onClick={importCurrentRecords}>
                            Import to workspace
                          </button>
                        </div>
                        <div className="record-summary">
                          <div className="mini-stat large">
                            <span>{gbifRecords.length}</span>
                            <p>GBIF records fetched</p>
                          </div>
                          <div className="mini-stat large">
                            <span>{selectedGbifSpecies?.canonicalName || '-'}</span>
                            <p>selected species</p>
                          </div>
                          <div className="mini-stat large">
                            <span>{myDatasets.length}</span>
                            <p>workspace imports</p>
                          </div>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {importSource === 'inat' ? (
                    <div className="data-grid data-grid-wide">
                      <article className="feature-tile feature-panel import-panel">
                        <span className="section-tag">iNaturalist import</span>
                        <h3>Search taxa and fetch observations</h3>
                        <p>Search iNaturalist, fetch geo-referenced observations, then import them into My Data.</p>
                        <div className="form-stack">
                          <label className="field-block">
                            <span>Species name</span>
                            <input className="text-input" value={inatQuery} onChange={(event) => setInatQuery(event.target.value)} placeholder="Panthera tigris" />
                          </label>
                          <button type="button" className="primary-button" onClick={searchInatTaxa}>
                            Search iNaturalist
                          </button>
                          <div className="species-results">
                            {inatTaxaResults.map((taxon) => (
                              <button
                                key={taxon.id}
                                type="button"
                                className={selectedInatTaxon?.id === taxon.id ? 'species-card active' : 'species-card'}
                                onClick={() => setSelectedInatTaxon(taxon)}
                              >
                                <strong>{taxon.name}</strong>
                                <span>{taxon.rank || 'Rank unknown'}</span>
                                <span>iNaturalist taxon ID: {taxon.id}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>

                      <article className="workspace-card import-workspace">
                        <div className="workspace-head">
                          <div>
                            <span className="section-tag">Observation fetch</span>
                            <h3>Prepare the iNaturalist fetch</h3>
                          </div>
                        </div>
                        <div className="filter-grid">
                          <label className="field-block">
                            <span>Observation limit</span>
                            <select className="text-input" value={inatLimit} onChange={(event) => setInatLimit(Number(event.target.value))}>
                              {[10, 20, 50, 100].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="info-card">
                            <strong>Region</strong>
                            <span>India bounding box preloaded for observation search.</span>
                          </div>
                        </div>
                        <div className="button-row">
                          <button type="button" className="secondary-button" onClick={fetchInatRecords}>
                            Fetch observations
                          </button>
                          <button type="button" className="primary-button" onClick={importCurrentRecords}>
                            Import to workspace
                          </button>
                        </div>
                        <div className="record-summary">
                          <div className="mini-stat large">
                            <span>{inatRecords.length}</span>
                            <p>iNaturalist observations</p>
                          </div>
                          <div className="mini-stat large">
                            <span>{selectedInatTaxon?.name || '-'}</span>
                            <p>selected taxon</p>
                          </div>
                          <div className="mini-stat large">
                            <span>{myDatasets.length}</span>
                            <p>workspace imports</p>
                          </div>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {importSource === 'climate' ? (
                    <div className="data-grid data-grid-wide">
                      <article className="feature-tile feature-panel import-panel">
                        <span className="section-tag">Climate rasters</span>
                        <h3>Search prepared climate raster layers</h3>
                        <p>Use this as the entry point for data.gov.in, bioclim bundles, and future climate connectors.</p>
                        <div className="form-stack">
                          <label className="field-block">
                            <span>Climate raster search</span>
                            <input className="text-input" value={climateQuery} onChange={(event) => setClimateQuery(event.target.value)} placeholder="bioclim, rainfall, temperature" />
                          </label>
                          <button type="button" className="primary-button" onClick={searchClimateCatalog}>
                            Search raster catalog
                          </button>
                          <div className="species-results">
                            {climateResults.map((item) => (
                              <div key={item.id} className="species-card static-card">
                                <strong>{item.title}</strong>
                                <span>{item.source}</span>
                                <span>{item.summary}</span>
                                <span>Resolution: {item.resolution}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>

                      <article className="workspace-card import-workspace">
                        <div className="workspace-head">
                          <div>
                            <span className="section-tag">Connector status</span>
                            <h3>Climate catalog flow</h3>
                          </div>
                        </div>
                        <div className="record-summary">
                          <div className="mini-stat large">
                            <span>{climateResults.length}</span>
                            <p>catalog matches</p>
                          </div>
                          <div className="mini-stat large">
                            <span>Ready</span>
                            <p>search interface</p>
                          </div>
                          <div className="mini-stat large">
                            <span>Next</span>
                            <p>direct download connector</p>
                          </div>
                        </div>
                        <p className="workspace-copy climate-note">
                          This climate flow is connector-ready for data.gov.in and curated bioclim raster catalogs.
                        </p>
                      </article>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="upload-grid">
                  <label className="upload-card">
                    <strong>Upload CSV</strong>
                    <span>Browse local CSV files and create a workspace dataset with parsed coordinates.</span>
                    <input type="file" accept=".csv,text/csv" onChange={(event) => handleUpload('csv', event.target.files)} />
                    <span className="upload-button">Browse CSV files</span>
                  </label>
                  <label className="upload-card">
                    <strong>Upload Raster</strong>
                    <span>Browse local raster layers in `.tif` or `.tiff` format.</span>
                    <input type="file" accept=".tif,.tiff" onChange={(event) => handleUpload('raster', event.target.files)} />
                    <span className="upload-button">Browse raster files</span>
                  </label>
                  <label className="upload-card">
                    <strong>Upload SHP</strong>
                    <span>Browse local `.shp` files and register them into My Data for later analysis tools.</span>
                    <input type="file" accept=".shp" onChange={(event) => handleUpload('shp', event.target.files)} />
                    <span className="upload-button">Browse shapefiles</span>
                  </label>
                </div>
              )}

              <div className="dataset-shell">
                <div className="dataset-head">
                  <div>
                    <span className="section-tag">Datasets</span>
                    <h3>Workspace data library</h3>
                  </div>
                  <div className="view-toggle">
                    <button type="button" className={libraryView === 'all' ? 'view-tab active' : 'view-tab'} onClick={() => setLibraryView('all')}>
                      All Data
                    </button>
                    <button type="button" className={libraryView === 'my' ? 'view-tab active' : 'view-tab'} onClick={() => setLibraryView('my')}>
                      My Data
                    </button>
                  </div>
                </div>

                <div className="library-grid">
                  <aside className="dataset-list">
                    {visibleDatasets.length ? (
                      visibleDatasets.map((dataset) => (
                        <button
                          key={dataset.id}
                          type="button"
                          className={selectedDataset?.id === dataset.id ? 'dataset-card active' : 'dataset-card'}
                          onClick={() => setSelectedDatasetId(dataset.id)}
                        >
                          <strong>{dataset.name}</strong>
                          <span>{dataset.source}</span>
                          <span>{dataset.type} · {dataset.count} records</span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-card">
                        <strong>No datasets yet</strong>
                        <span>Import or upload data to populate My Data.</span>
                      </div>
                    )}
                  </aside>

                  <article className="workspace-card fixed-preview-card">
                    <div className="workspace-head">
                      <div>
                        <span className="section-tag">Preview</span>
                        <h3>{selectedDataset?.name || 'Select a dataset'}</h3>
                      </div>
                      <div className="view-toggle">
                        <button type="button" className={dataView === 'table' ? 'view-tab active' : 'view-tab'} onClick={() => setDataView('table')}>
                          Table View
                        </button>
                        <button type="button" className={dataView === 'map' ? 'view-tab active' : 'view-tab'} onClick={() => setDataView('map')}>
                          Map View
                        </button>
                      </div>
                    </div>

                    <div className="dataset-toolbar">
                      <span className="dataset-meta">{selectedDataset?.type || 'Dataset'} · {selectedDataset?.source || '-'}</span>
                      <div className="button-row compact-buttons">
                        <button type="button" className="secondary-button" onClick={downloadSelectedDataset} disabled={!selectedDataset}>
                          Download
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={deleteSelectedDataset}
                          disabled={!selectedDataset || selectedDataset.owner !== 'My Data'}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {selectedDataset && !selectedDataset.records.length ? (
                      <div className="metadata-card">
                        <strong>{selectedDataset.type} dataset</strong>
                        <p>This dataset is registered in the workspace and ready for later tools even though it does not yet have previewable point records.</p>
                        <code>{JSON.stringify(selectedDataset.metadata || {}, null, 2)}</code>
                      </div>
                    ) : (
                      <div className={dataView === 'table' ? 'preview-panel table-preview fixed-dimension-panel' : 'preview-panel map-preview real-map-panel fixed-dimension-panel'}>
                        {selectedDataset ? (
                          dataView === 'table' ? (
                            <>
                              <div className="preview-table-row preview-table-head">
                                <span>Species</span>
                                <span>Latitude</span>
                                <span>Longitude</span>
                                <span>Status</span>
                              </div>
                              <div className="table-scroll">
                                {previewRecords.slice(0, 12).map((record) => (
                                  <div key={record.key} className="preview-table-row">
                                    <span>{record.species}</span>
                                    <span>{record.lat?.toFixed(4) ?? '-'}</span>
                                    <span>{record.lng?.toFixed(4) ?? '-'}</span>
                                    <span>{record.status}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <DatasetMap records={previewRecords} />
                          )
                        ) : (
                          <div className="empty-preview">Select a dataset to preview it.</div>
                        )}
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </div>
          ) : null}

          {currentSection.id === 'analysis' ? (
            <div className="analysis-shell">
              <div className="analysis-grid">
                <article className="workspace-card">
                  <span className="section-tag">Pick dataset</span>
                  <h3>Use imported or uploaded data in the next tools</h3>
                  {myDatasets.length ? (
                    <label className="field-block analysis-field">
                      <span>Dataset for analysis</span>
                      <select className="text-input" value={analysisDataset?.id || ''} onChange={(event) => setAnalysisDatasetId(event.target.value)}>
                        {myDatasets.map((dataset) => (
                          <option key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="empty-card">
                      <strong>No My Data yet</strong>
                      <span>Import or upload data in the Data tab to make it available for analysis.</span>
                    </div>
                  )}
                </article>

                <article className="workspace-card">
                  <span className="section-tag">Suggested tools</span>
                  <h3>Choose the next processing step</h3>
                    <div className="tool-grid">
                    {['Calculate mean coordinate', 'Check data quality', 'Generate biodiversity summary'].map((tool) => (
                      <button key={tool} type="button" className="tool-card" onClick={() => runAnalysis(tool)} disabled={!analysisDataset}>
                        <strong>{tool}</strong>
                        <span>Send output to Insight with summary, inference, and data story.</span>
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {currentSection.id === 'insight' ? (
            <div className="insight-grid">
              {analysisOutputs.length ? (
                analysisOutputs.map((output) => (
                  <article key={output.id} className="workspace-card insight-card">
                    <span className="section-tag">Output</span>
                    <h3>{output.toolName}</h3>
                    <p><strong>Dataset:</strong> {output.datasetName}</p>
                    <p><strong>Summary:</strong> {output.summary}</p>
                    {output.metric ? <p><strong>Mean:</strong> {output.metric}</p> : null}
                    <p><strong>Inference:</strong> {output.inference}</p>
                    <p><strong>Data story:</strong> {output.story}</p>
                  </article>
                ))
              ) : (
                <div className="empty-home">
                  <strong>No outputs yet</strong>
                  <p>Run a tool in Analysis and the output will appear here with inference and story framing.</p>
                </div>
              )}
            </div>
          ) : null}

          {currentSection.id === 'attribution' ? (
            <div className="attribution-grid">
              <article className="workspace-card">
                <span className="section-tag">Software stack</span>
                <h3>Packages and versions used in this platform</h3>
                <div className="version-grid">
                  {packageVersions.map((item) => (
                    <div key={item.name} className="version-card">
                      <strong>{item.name}</strong>
                      <span>{item.version}</span>
                      <small>{item.kind}</small>
                    </div>
                  ))}
                </div>
              </article>
              <article className="workspace-card">
                <span className="section-tag">Platform metadata</span>
                <h3>Software notes and citation context</h3>
                <div className="version-grid">
                  {softwareVersions.map((item) => (
                    <div key={item.name} className="version-card">
                      <strong>{item.name}</strong>
                      <span>{item.version}</span>
                    </div>
                  ))}
                </div>
                <p className="citation-note">
                  Cite the platform, the source dataset, the workflow used, and the derived outputs together for FAIR-aware reuse.
                </p>
              </article>
            </div>
          ) : null}
        </section>

        <footer className="page-footer">
          <span className="section-tag">Project record</span>
          <p>Requirements and feature notes are tracked in `requirements_log.txt` at the repo root.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
