document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL: Mobile Menu Logic ---
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            navLinks?.classList.toggle('active');
        });
    }

    // --- GLOBAL: Instrument Modal Logic ---
    const modal = document.getElementById('instrumentModal');
    if (modal) {
        const closeBtn = document.getElementById('modalCloseBtn');
        const instrumentCards = document.querySelectorAll('.instrument-card, .collection-card');
        instrumentCards.forEach(card => {
            card.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = card.dataset.title;
                document.getElementById('modalImage').src = card.dataset.imgSrc;
                document.getElementById('modalDescription').textContent = card.dataset.description;
                modal.classList.add('active');
            });
        });
        const closeModal = () => modal.classList.remove('active');
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // --- GENERATOR PAGE LOGIC ---
    if (document.getElementById('btn-generate')) {
        let latestGeneratedData = null;
        initGenerator();

        function initGenerator() {
            const generateBtn = document.getElementById('btn-generate');
            const geolocateBtn = document.getElementById('btn-geolocate');
            const statusEl = document.getElementById('geolocation-status');
            const downloadBtn = document.getElementById('btn-download');
            const canvas = document.getElementById('blueprint-canvas');
            paper.setup(canvas);

            geolocateBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    statusEl.textContent = "Geolocation is not supported by your browser.";
                    statusEl.classList.add('error');
                    return;
                }
                statusEl.textContent = 'Fetching your location...';
                statusEl.classList.remove('error');
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        statusEl.textContent = '✅ Location found!';
                        document.getElementById('latitude-gen').value = pos.coords.latitude.toFixed(4);
                        document.getElementById('longitude-gen').value = pos.coords.longitude.toFixed(4);
                        setTimeout(() => {
                            statusEl.textContent = '';
                        }, 3000);
                    },
                    (error) => {
                        statusEl.classList.add('error');
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                statusEl.textContent = "Error: You denied the request for Geolocation.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                statusEl.textContent = "Error: Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                statusEl.textContent = "Error: The request to get user location timed out.";
                                break;
                            case error.UNKNOWN_ERROR:
                                statusEl.textContent = "An unknown error occurred.";
                                break;
                        }
                    }
                );
            });

            generateBtn.addEventListener('click', () => {
                const latitudeInput = document.getElementById('latitude-gen').value;
                const latitude = parseFloat(latitudeInput);
                const instrument = document.getElementById('instrument-select').value;

                if (latitudeInput.trim() === '' || isNaN(latitude) || latitude < -90 || latitude > 90) {
                    alert("Please enter a valid latitude (from -90 to 90) to generate dimensions.");
                    return;
                }

                const dimensions = calculateDimensions(instrument, latitude);
                updateDimensionsUI(instrument, dimensions);
                updateYantraModel(instrument);
                updateBlueprintView(instrument, dimensions);
                latestGeneratedData = {
                    instrument,
                    dimensions
                };
            });

            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!latestGeneratedData) {
                    alert("Please generate dimensions first before downloading.");
                    return;
                }
                generateAndDownloadFile(latestGeneratedData);
            });

            const btn2d = document.getElementById('btn-2d');
            const btn3d = document.getElementById('btn-3d');
            const view2d = document.getElementById('model-viewer-2d');
            const view3d = document.getElementById('model-viewer-3d');

            btn2d.addEventListener('click', () => toggleView('2d'));
            btn3d.addEventListener('click', () => toggleView('3d'));

            function toggleView(viewToShow) {
                if (viewToShow === '2d') {
                    btn2d.classList.add('active');
                    btn3d.classList.remove('active');
                    view2d.style.display = 'block';
                    view3d.style.display = 'none';
                    paper.view.draw();
                } else {
                    btn3d.classList.add('active');
                    btn2d.classList.remove('active');
                    view3d.style.display = 'block';
                    view2d.style.display = 'none';
                }
            }
        }

        function calculateDimensions(instrument, latitude) {
            if (instrument === 'samrat') {
                return calculateSamratYantraDimensions(latitude, 2.0);
            }
            if (instrument === 'misra') {
                const sundialDims = calculateSamratYantraDimensions(latitude, 0.5);
                return {
                    ...sundialDims,
                    orientation: "Gnomon must point to True North.",
                    height: 8.0,
                    width: 11.0,
                    markings: "Hour/declination lines on quadrants; altitude on meridian wall."
                };
            }
            return {};
        }

        function calculateSamratYantraDimensions(latitude, gnomonHeight) {
            if (latitude === 0) return {
                angle: 0,
                height: gnomonHeight,
                base: Infinity,
                radius: Infinity
            };
            const angleRad = latitude * (Math.PI / 180);
            const baseLength = gnomonHeight / Math.tan(angleRad);
            const dialRadius = gnomonHeight / Math.sin(angleRad);
            return {
                angle: latitude,
                height: gnomonHeight,
                base: Math.abs(baseLength),
                radius: Math.abs(dialRadius)
            };
        }

        function updateDimensionsUI(instrument, dims) {
            const list = document.getElementById('dimensions-list');
            const heading = document.getElementById('dimensions-heading');
            list.innerHTML = '';
            const formatDim = (value) => isFinite(value) ? value.toFixed(2) : "Infinite (not buildable)";

            if (instrument === 'samrat') {
                heading.textContent = '3. Generated Dimensions';
                list.innerHTML = `<li><span>Angle of Incline</span><strong>${formatDim(dims.angle)}°</strong></li><li><span>Gnomon Height</span><strong>${formatDim(dims.height)}m</strong></li><li><span>Base Length</span><strong>${formatDim(dims.base)}m</strong></li><li><span>Dial Radius</span><strong>${formatDim(dims.radius)}m</strong></li>`;
            } else if (instrument === 'misra') {
                heading.textContent = '3. Misra Yantra: Construction Principles';
                list.innerHTML = `<li title="The main gnomon must be aligned with Earth's axis at your location."><span>Inclination Angle</span><strong>${formatDim(dims.angle)}°</strong></li><li title="Overall fixed height of the central structure."><span>Structure Height</span><strong>${formatDim(dims.height)}m (Fixed)</strong></li><li title="Overall fixed width of the central structure."><span>Structure Width</span><strong>${formatDim(dims.width)}m (Fixed)</strong></li><li title="The instrument must be perfectly aligned with the cardinal directions."><span>Orientation</span><strong>${dims.orientation}</strong></li><li title="Scales must be accurately inscribed for measurements."><span>Markings</span><strong>${dims.markings}</strong></li>`;
            }
        }

        function updateYantraModel(instrument) {
            const viewerContainer = document.getElementById('model-viewer-3d');
            let embedCode = '';
            if (instrument === 'samrat') {
                embedCode = `<iframe title="Laghu Samrat Yantra" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-s tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/2064afec3c694c2098dc47c58934cf9d/embed?autospin=1&autostart=1&ui_theme=dark"></iframe>`;
            } else if (instrument === 'misra') {
                embedCode = `<iframe title="Jantar Mantar" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/88c5c4e89928470a8f7e54bf1be13504/embed?autospin=1&autostart=1&ui_theme=dark"></iframe>`;
            }
            viewerContainer.innerHTML = embedCode;
            const iframe = viewerContainer.querySelector('iframe');
            if (iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
            }
        }

        function updateBlueprintView(instrument, dims) {
            const container = document.getElementById('model-viewer-2d');

            if (instrument === 'samrat') {
                container.style.background = 'none';
                container.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%;">
                  <img src="samrat-yantra01.jpg" alt="Samrat Yantra Blueprint 1" style="max-width: 100%; max-height: 100%;">
                  <img src="samrat-yantra02.jpg" alt="Samrat Yantra Blueprint 2" style="max-width: 100%; max-height: 100%;">
                </div>`;
            } else if (instrument === 'misra') {
                container.style.background = 'none';
                container.innerHTML = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%;">
                  <img src="misra-blueprint.jpg" alt="Misra Yantra Blueprint" style="max-width: 100%; max-height: 100%;">
                  <img src="misra-blueprint2.jpg" alt="Misra Yantra Blueprint 2" style="max-width: 100%; max-height: 100%;">
                </div>`;
            }
        }

        function generateBlueprint(dims) {
            paper.project.clear();
            const view = paper.view;
            const w = view.size.width;
            const h = view.size.height;
            const padding = 40;
            const drawingArea = new paper.Rectangle(padding, padding, w - padding * 2, h - padding * 2);
            const scale = Math.min(drawingArea.width / dims.base, drawingArea.height / dims.height);
            const scaledBase = dims.base * scale;
            const scaledHeight = dims.height * scale;
            const bottomLeft = new paper.Point(drawingArea.left, drawingArea.bottom);
            const bottomRight = new paper.Point(drawingArea.left + scaledBase, drawingArea.bottom);
            const topLeft = new paper.Point(drawingArea.left, drawingArea.bottom - scaledHeight);
            const gnomon = new paper.Path({
                segments: [bottomLeft, bottomRight, topLeft],
                closed: true,
                strokeColor: '#3498db',
                strokeWidth: 2,
                fillColor: new paper.Color(0.204, 0.596, 0.859, 0.1)
            });
            const textStyle = {
                fillColor: '#ecf0f1',
                fontSize: 12,
                fontFamily: 'Poppins'
            };
            const lineStyle = {
                strokeColor: '#7f8c8d',
                strokeWidth: 1
            };
            new paper.Path.Line({
                from: [topLeft.x - 10, topLeft.y],
                to: [topLeft.x - 10, bottomLeft.y],
                ...lineStyle
            });
            new paper.PointText({
                point: [topLeft.x - 15, topLeft.y + scaledHeight / 2],
                content: `${dims.height.toFixed(2)}m`,
                justification: 'center',
                rotation: -90,
                ...textStyle
            });
            new paper.Path.Line({
                from: [bottomLeft.x, bottomLeft.y + 10],
                to: [bottomRight.x, bottomRight.y + 10],
                ...lineStyle
            });
            new paper.PointText({
                point: [bottomLeft.x + scaledBase / 2, bottomLeft.y + 25],
                content: `${dims.base.toFixed(2)}m`,
                justification: 'center',
                ...textStyle
            });
            new paper.Path.Arc({
                from: topLeft.add([20, 0]),
                through: topLeft.add([20, 20]),
                to: topLeft.add([0, 20]),
                ...lineStyle
            });
            new paper.PointText({
                point: topLeft.add([25, 30]),
                content: `${dims.angle.toFixed(2)}°`,
                ...textStyle
            });
            paper.view.draw();
        }

        function generateAndDownloadFile(data) {
            const {
                instrument,
                dimensions
            } = data;
            let fileContent = '';
            let fileName = '';
            const formatDim = (value) => isFinite(value) ? value.toFixed(2) : "Infinite";

            if (instrument === 'samrat') {
                fileName = 'samrat-yantra-dimensions.txt';
                fileContent = `AstroYantra.ai - Generated Dimensions\n------------------------------------\nInstrument: Samrat Yantra\nLocation Latitude: ${dimensions.angle.toFixed(4)}°\n\nDimensions:\n- Angle of Incline: ${formatDim(dimensions.angle)}°\n- Gnomon Height: ${formatDim(dimensions.height)}m\n- Base Length: ${formatDim(dimensions.base)}m\n- Dial Radius: ${formatDim(dimensions.radius)}m\n`;
            } else if (instrument === 'misra') {
                fileName = 'misra-yantra-principles.txt';
                fileContent = `AstroYantra.ai - Construction Principles\n----------------------------------------\nInstrument: Misra Yantra\nLocation Latitude: ${dimensions.angle.toFixed(4)}°\n\nPrinciples for Reconstruction:\n- Inclination Angle: ${formatDim(dimensions.angle)}° (For the sundial component)\n- Structure Height: ${formatDim(dimensions.height)}m (Fixed architectural dimension)\n- Structure Width: ${formatDim(dimensions.width)}m (Fixed architectural dimension)\n- Orientation: ${dimensions.orientation}\n- Markings: ${dimensions.markings}\n`;
            }

            const blob = new Blob([fileContent], {
                type: 'text/plain;charset=utf-8'
            });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
});