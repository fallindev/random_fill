document.addEventListener("DOMContentLoaded", () => {
    const combinedOsmdCanvas = document.getElementById("combinedOsmdCanvas");
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(combinedOsmdCanvas, {
        autoResize: true,
        backend: "svg",
        drawTitle: false,
        drawSubtitle: true,
        drawComposer: true,
        drawLyricist: true,
        drawMetronomeMarks: false,
        drawDynamics: false,
        drawExpressions: false,
        drawWords: false,
        drawDirections: false,
        zoom: 0.5,
        spacingFactor: 0.8,
        maxSystemWidth: 200,
        renderSingleHorizontalStaffline: true,
    });

    const beatsInput = document.getElementById("beatsInput");
    const loadMusicButton = document.getElementById("loadMusicButton");
    const osmdCanvas = document.getElementById("osmdCanvas"); // 개별 악보를 표시하는 기존 osmdCanvas

    let individualMeasureXmls = []; // 각 개별 마디의 XML 문자열을 저장할 배열

    loadMusicButton.addEventListener("click", async () => {
        try {
            combinedOsmdCanvas.innerHTML = ""; // 조합된 악보 영역만 지우기

            const selectedMeasureXmls = [];
            const checkedCheckboxes = document.querySelectorAll('.measure-checkbox:checked');
            console.log('Checked checkboxes found:', checkedCheckboxes.length);

            checkedCheckboxes.forEach(checkbox => {
                const index = parseInt(checkbox.value, 10);
                console.log(`Processing checkbox with value: ${index}`);
                if (individualMeasureXmls[index]) {
                    selectedMeasureXmls.push(individualMeasureXmls[index]);
                    console.log(`Added XML for index ${index}. Current selectedMeasureXmls length: ${selectedMeasureXmls.length}`);
                } else {
                    console.log(`No XML found for index ${index} in individualMeasureXmls.`);
                }
            });

            if (selectedMeasureXmls.length === 0) {
                combinedOsmdCanvas.innerHTML = `<p style="color: orange;">조합할 리듬을 선택해주세요.</p>`;
                return;
            }

            // 선택된 리듬들을 조합하는 로직 (기존 로직과 유사)
            const parser = new DOMParser();
            const originalXmlDoc = parser.parseFromString(selectedMeasureXmls[0], "application/xml"); // 첫 번째 선택된 XML을 기준으로 구조 복사

            const newXmlDoc = originalXmlDoc.cloneNode(true);
            const newScorePartwise = newXmlDoc.querySelector("score-partwise");
            const newPart = newXmlDoc.querySelector("part");

            let existingMeasures = newPart.querySelectorAll("measure");
            existingMeasures.forEach(measure => measure.remove());

            const numberOfBeats = parseInt(beatsInput.value, 10);
            if (isNaN(numberOfBeats) || numberOfBeats < 1) {
                throw new Error("유효한 박자 수를 입력해주세요 (1 이상).");
            }

            const numberOfNewMeasures = 1; // 조합된 악보는 하나의 마디로 표시

            for (let i = 0; i < numberOfNewMeasures; i++) {
                const newMeasure = newXmlDoc.createElement("measure");
                newMeasure.setAttribute("number", (i + 1).toString());

                // 첫 번째 마디에만 attributes를 추가하고 입력된 박자로 변경합니다.
                if (i === 0) {
                    const originalFirstMeasureAttributes = originalXmlDoc.querySelector("part > measure > attributes");
                    if (originalFirstMeasureAttributes) {
                        const newAttributes = newXmlDoc.importNode(originalFirstMeasureAttributes, true);
                        
                        let timeElement = newAttributes.querySelector("time");
                        if (timeElement) {
                            let beats = timeElement.querySelector("beats");
                            let beatType = timeElement.querySelector("beat-type");
                            if (beats) beats.textContent = numberOfBeats.toString();
                            if (beatType) beatType.textContent = "4";
                        } else {
                            timeElement = newXmlDoc.createElement("time");
                            const beats = newXmlDoc.createElement("beats");
                            beats.textContent = numberOfBeats.toString();
                            const beatType = newXmlDoc.createElement("beat-type");
                            beatType.textContent = "4";
                            timeElement.appendChild(beats);
                            timeElement.appendChild(beatType);
                            newAttributes.appendChild(timeElement);
                        }

                        let staffDetailsElement = newAttributes.querySelector("staff-details");
                        if (!staffDetailsElement) {
                            staffDetailsElement = newXmlDoc.createElement("staff-details");
                            staffDetailsElement.setAttribute("number", "1");
                            newAttributes.appendChild(staffDetailsElement);
                        }
                        let staffLinesElement = staffDetailsElement.querySelector("staff-lines");
                        if (!staffLinesElement) {
                            staffLinesElement = newXmlDoc.createElement("staff-lines");
                            staffDetailsElement.appendChild(staffLinesElement);
                        }
                        staffLinesElement.textContent = "5";

                        newMeasure.appendChild(newAttributes);
                    }
                }

                // 선택된 리듬들 중에서 랜덤으로 선택하여 새 마디에 추가합니다.
                for (let j = 0; j < numberOfBeats; j++) {
                    const randomIndex = Math.floor(Math.random() * selectedMeasureXmls.length);
                    const selectedXmlString = selectedMeasureXmls[randomIndex];
                    const tempDoc = parser.parseFromString(selectedXmlString, "application/xml");
                    const tempMeasure = tempDoc.querySelector("measure");

                    Array.from(tempMeasure.children).forEach(child => {
                        if (child.tagName !== "attributes" && child.tagName !== "print") { // print도 제외
                            newMeasure.appendChild(newXmlDoc.importNode(child, true));
                        }
                    });
                }
                newPart.appendChild(newMeasure);
            }

            const serializer = new XMLSerializer();
            let newXmlString = serializer.serializeToString(newXmlDoc);

            if (!newXmlString.startsWith("<?xml")) {
                newXmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + newXmlString;
            }

            console.log("Generated MusicXML (Combined Rhythms):\n", newXmlString);

            await osmd.load(newXmlString);
            await osmd.render();

        } catch (error) {
            console.error("MusicXML 로드 또는 처리 중 오류 발생:", error);
            combinedOsmdCanvas.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    });

    // 페이지 로드 시 모든 원본 리듬을 자동으로 표시하는 함수
    async function loadAndDisplayAllOriginalRhythms() {
        try {
            osmdCanvas.innerHTML = ""; // 기존 악보 지우기
            individualMeasureXmls = []; // 배열 초기화

            const response = await fetch("Empty0.xml");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const xmlText = await response.text();

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const originalMeasures = [];
            const measures = xmlDoc.querySelectorAll("part > measure");

            measures.forEach(measure => {
                originalMeasures.push(measure.cloneNode(true));
            });

            if (originalMeasures.length === 0) {
                osmdCanvas.innerHTML = `<p style="color: orange;">Empty0.xml에서 처리할 마디를 찾을 수 없습니다.</p>`;
                return;
            }

            // 원본 XML의 공통 구조 (identification, defaults, part-list)를 미리 복사
            const originalIdentification = xmlDoc.querySelector("identification");
            const originalDefaults = xmlDoc.querySelector("defaults");
            const originalPartList = xmlDoc.querySelector("part-list");

            originalMeasures.forEach((originalMeasure, index) => {
                const measureContainer = document.createElement('div');
                measureContainer.className = 'individual-measure-container';
                measureContainer.style.marginBottom = '20px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'measure-checkbox';
                checkbox.id = `measure-${index}`;
                checkbox.value = index;
                checkbox.checked = true; // 기본적으로 모두 선택되도록 설정

                const label = document.createElement('label');
                label.htmlFor = `measure-${index}`;
                label.textContent = `리듬 ${index + 1}`;

                const osmdIndividualDiv = document.createElement('div');
                osmdIndividualDiv.id = `osmd-individual-canvas-${index}`;
                osmdIndividualDiv.style.width = '100%';
                osmdIndividualDiv.style.height = '150px'; // 개별 악보 높이 조절
                osmdIndividualDiv.style.border = '1px solid #eee';

                measureContainer.appendChild(checkbox);
                measureContainer.appendChild(label);
                measureContainer.appendChild(osmdIndividualDiv);
                osmdCanvas.appendChild(measureContainer);

                // 개별 마디를 위한 최소한의 MusicXML 생성
                const tempXmlDoc = document.implementation.createDocument(null, "score-partwise", null);
                const tempScorePartwise = tempXmlDoc.documentElement;
                tempScorePartwise.setAttribute("version", "2.0");

                if (originalIdentification) tempScorePartwise.appendChild(tempXmlDoc.importNode(originalIdentification, true));
                if (originalDefaults) tempScorePartwise.appendChild(tempXmlDoc.importNode(originalDefaults, true));
                if (originalPartList) tempScorePartwise.appendChild(tempXmlDoc.importNode(originalPartList, true));

                const tempPart = tempXmlDoc.createElement("part");
                tempPart.setAttribute("id", "P1");
                tempScorePartwise.appendChild(tempPart);

                const tempMeasure = tempXmlDoc.importNode(originalMeasure, true);
                tempMeasure.setAttribute("number", "1"); // 개별 악보에서는 마디 번호를 1로 설정

                // 개별 악보의 attributes 설정 (1/4 박자, 5선지)
                const originalMeasureAttributes = originalMeasure.querySelector("attributes");
                if (originalMeasureAttributes) {
                    const tempAttributes = tempXmlDoc.importNode(originalMeasureAttributes, true);
                    
                    let timeElement = tempAttributes.querySelector("time");
                    if (timeElement) {
                        let beats = timeElement.querySelector("beats");
                        let beatType = timeElement.querySelector("beat-type");
                        if (beats) beats.textContent = "1";
                        if (beatType) beatType.textContent = "4";
                    } else {
                        timeElement = tempXmlDoc.createElement("time");
                        const beats = tempXmlDoc.createElement("beats");
                        beats.textContent = "1";
                        const beatType = tempXmlDoc.createElement("beat-type");
                        beatType.textContent = "4";
                        timeElement.appendChild(beats);
                        timeElement.appendChild(beatType);
                        tempAttributes.appendChild(timeElement);
                    }

                    let staffDetailsElement = tempAttributes.querySelector("staff-details");
                    if (!staffDetailsElement) {
                        staffDetailsElement = tempXmlDoc.createElement("staff-details");
                        staffDetailsElement.setAttribute("number", "1");
                        tempAttributes.appendChild(staffDetailsElement);
                    }
                    let staffLinesElement = staffDetailsElement.querySelector("staff-lines");
                    if (!staffLinesElement) {
                        staffLinesElement = tempXmlDoc.createElement("staff-lines");
                        staffDetailsElement.appendChild(staffLinesElement);
                    }
                    staffLinesElement.textContent = "5";

                    tempMeasure.insertBefore(tempAttributes, tempMeasure.firstChild); // attributes를 measure의 첫 자식으로 추가
                }

                // print new-system="yes" 제거 (개별 악보에서는 필요 없음)
                const printElement = tempMeasure.querySelector("print");
                if (printElement) printElement.remove();

                tempPart.appendChild(tempMeasure);

                const serializer = new XMLSerializer();
                let individualXmlString = serializer.serializeToString(tempXmlDoc);

                if (!individualXmlString.startsWith("<?xml")) {
                    individualXmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + individualXmlString;
                }

                individualMeasureXmls[index] = individualXmlString; // XML 문자열 저장

                const osmdIndividual = new opensheetmusicdisplay.OpenSheetMusicDisplay(osmdIndividualDiv.id, {
                    autoResize: false, // 개별 인스턴스는 자동 리사이즈 끄기
                    backend: "svg",
                    drawTitle: false,
                    drawSubtitle: false,
                    drawComposer: false,
                    drawLyricist: false,
                    drawMetronomeMarks: false,
                    drawDynamics: false,
                    drawExpressions: false,
                    drawWords: false,
                    drawDirections: false,
                    zoom: 0.8, // 개별 악보의 줌 레벨 조절
                    spacingFactor: 0.8,
                    maxSystemWidth: 500, // 개별 악보의 시스템 너비 조절
                    renderSingleHorizontalStaffline: true,
                });

                osmdIndividual.load(individualXmlString).then(() => {
                    osmdIndividual.render();
                }).catch(error => {
                    console.error(`개별 악보 ${index} 로드 또는 처리 중 오류 발생:`, error);
                    osmdIndividualDiv.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
                });
            });

        } catch (error) {
            console.error("모든 원본 MusicXML 로드 또는 처리 중 오류 발생:", error);
            osmdCanvas.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    }

    // 페이지 로드 시 자동으로 함수 호출
    loadAndDisplayAllOriginalRhythms();
});