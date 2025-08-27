document.addEventListener("DOMContentLoaded", () => {
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
        autoResize: true,
        backend: "svg",
        drawTitle: false,
        // drawSubtitle: true,
        drawComposer: true,
        drawLyricist: false,
        drawMetronomeMarks: false,
        drawDynamics: false,
        drawExpressions: false,
        drawWords: false,
        drawDirections: false,
        drawPartNames: true,
        drawPartAbbrs: true,
        drawMeasureNumbers: true,
        drawFingerings: true,
        fingeringPosition: "left",
        setBravuraFont: true,
        setWavyLineWithSmallWavyLine: true,
        renderSingleHorizontalStaffline: true,
        
        fitPageWidth: true,
        // zoom: 1,
        // spacingFactor: 0.8,
        // coloringMode: 1,
    });

    const beatsInput = document.getElementById("beatsInput");
    const loadMusicButton = document.getElementById("loadMusicButton");
    const osmdCanvas = document.getElementById("osmdCanvas");

    loadMusicButton.addEventListener("click", async () => {
        try {
            // 이전 악보를 지웁니다.
            osmdCanvas.innerHTML = "";

            const response = await fetch("Empty0.xml");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const xmlText = await response.text();

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const originalMeasures = [];
            const measures = xmlDoc.querySelectorAll("part > measure");

            // 원본 XML에서 1박 단위의 마디들을 복사하여 저장합니다.
            measures.forEach(measure => {
                originalMeasures.push(measure.cloneNode(true));
            });

            if (originalMeasures.length === 0) {
                throw new Error("Empty0.xml에서 처리할 마디를 찾을 수 없습니다.");
            }

            // 원본 XML 문서를 깊은 복사하여 수정할 새 문서를 만듭니다.
            const newXmlDoc = xmlDoc.cloneNode(true);
            const newScorePartwise = newXmlDoc.querySelector("score-partwise");
            const newPart = newXmlDoc.querySelector("part"); // 기존 part 요소를 가져옵니다.

            // 기존 part 요소에서 모든 measure를 제거합니다.
            let existingMeasures = newPart.querySelectorAll("measure");
            existingMeasures.forEach(measure => measure.remove());

            const numberOfBeats = parseInt(beatsInput.value, 10);
            if (isNaN(numberOfBeats) || numberOfBeats < 1) {
                throw new Error("유효한 박자 수를 입력해주세요 (1 이상).");
            }

            const numberOfNewMeasures = 1; // Generate only 1 new 4-beat measure

            for (let i = 0; i < numberOfNewMeasures; i++) {
                const newMeasure = newXmlDoc.createElement("measure");
                newMeasure.setAttribute("number", (i + 1).toString());

                // 첫 번째 마디에만 attributes를 추가하고 입력된 박자로 변경합니다.
                if (i === 0) { // 생성된 악보의 첫 번째 마디에만 적용
                    const originalFirstMeasureAttributes = xmlDoc.querySelector("part > measure > attributes");
                    if (originalFirstMeasureAttributes) {
                        const newAttributes = newXmlDoc.importNode(originalFirstMeasureAttributes, true);
                        
                        // 박자를 입력된 값으로 변경합니다.
                        let timeElement = newAttributes.querySelector("time");
                        if (timeElement) {
                            let beats = timeElement.querySelector("beats");
                            let beatType = timeElement.querySelector("beat-type");
                            if (beats) beats.textContent = numberOfBeats.toString();
                            if (beatType) beatType.textContent = "4"; // 4분음표 기준 박자
                        } else { // time 요소가 없으면 새로 생성합니다.
                            timeElement = newXmlDoc.createElement("time");
                            const beats = newXmlDoc.createElement("beats");
                            beats.textContent = numberOfBeats.toString();
                            const beatType = newXmlDoc.createElement("beat-type");
                            beatType.textContent = "4";
                            timeElement.appendChild(beats);
                            timeElement.appendChild(beatType);
                            newAttributes.appendChild(timeElement);
                        }
                        newMeasure.appendChild(newAttributes);

                        // Add or modify <staff-lines> to 5
                        let staffDetailsElement = newAttributes.querySelector("staff-details");
                        if (!staffDetailsElement) {
                            staffDetailsElement = newXmlDoc.createElement("staff-details");
                            staffDetailsElement.setAttribute("number", "1"); // Assuming staff number 1
                            newAttributes.appendChild(staffDetailsElement);
                        }
                        let staffLinesElement = staffDetailsElement.querySelector("staff-lines");
                        if (!staffLinesElement) {
                            staffLinesElement = newXmlDoc.createElement("staff-lines");
                            staffDetailsElement.appendChild(staffLinesElement);
                        }
                        staffLinesElement.textContent = "5";

                        // --- TEMPORARY: Change clef to G for testing 5-line staff ---
                        let clefElement = newAttributes.querySelector("clef");
                        if (clefElement) {
                            let signElement = clefElement.querySelector("sign");
                            if (signElement) signElement.textContent = "G";
                            let lineElement = clefElement.querySelector("line");
                            if (!lineElement) {
                                lineElement = newXmlDoc.createElement("line");
                                clefElement.appendChild(lineElement);
                            }
                            lineElement.textContent = "2";
                        } else {
                            clefElement = newXmlDoc.createElement("clef");
                            clefElement.setAttribute("number", "1");
                            const signElement = newXmlDoc.createElement("sign");
                            signElement.textContent = "G";
                            const lineElement = newXmlDoc.createElement("line");
                            lineElement.textContent = "2";
                            clefElement.appendChild(signElement);
                            clefElement.appendChild(lineElement);
                            newAttributes.appendChild(clefElement);
                        }
                        // --- END TEMPORARY CHANGE ---

                        newMeasure.appendChild(newAttributes);
                    }
                }

                // 입력된 박자 수만큼 원본 1박 마디를 랜덤으로 선택하여 새 마디에 추가합니다.
                for (let j = 0; j < numberOfBeats; j++) {
                    const randomIndex = Math.floor(Math.random() * originalMeasures.length);
                    const selectedOriginalMeasure = originalMeasures[randomIndex];

                    // 선택된 원본 마디의 자식 노드(음표, 지시 등)를 모두 추가합니다。
                    // 단, attributes는 별도로 처리하므로 제외합니다。
                    Array.from(selectedOriginalMeasure.children).forEach(child => {
                        if (child.tagName !== "attributes") {
                            newMeasure.appendChild(newXmlDoc.importNode(child, true));
                        }
                    });
                }
                newPart.appendChild(newMeasure);
            }

            const serializer = new XMLSerializer();
            let newXmlString = serializer.serializeToString(newXmlDoc);

            // XML 선언이 누락된 경우 명시적으로 추가합니다.
            if (!newXmlString.startsWith("<?xml")) {
                newXmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + newXmlString;
            }

            console.log("Generated MusicXML:\n", newXmlString); // 디버깅을 위해 콘솔에 출력

            await osmd.load(newXmlString);
            await osmd.render();

        } catch (error) {
            console.error("MusicXML 로드 또는 처리 중 오류 발생:", error);
            osmdCanvas.innerHTML = `<p style="color: red;">오류: ${error.message}</p>`;
        }
    });
});