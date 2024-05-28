document.addEventListener("DOMContentLoaded", function () {
    var gumStream;
    var rec;
    var input;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var audioContext;
    var recordButton = document.getElementById("recordButton");
    var stopButton = document.getElementById("stopButton");
    var pauseButton = document.getElementById("pauseButton");
    var timerDisplay = document.getElementById("timerDisplay");
    var pauseButtonIcon = document.getElementById("pauseButtonIcon");
    var recordTitle = 0;

    var timer; // Timer değişkeni
    var timerStarted = false; // Başlangıçta timer'ın başlamadığını belirten değişken

    recordButton.addEventListener("click", startRecording);
    stopButton.addEventListener("click", stopRecording);
    pauseButton.addEventListener("click", pauseRecording);

    function startRecording() {
        console.log("recordButton clicked");
        console.log(recordTitle)

        // Timer'ı sıfırla
        clearInterval(timer);
        timerDisplay.textContent = "0:00";

        var constraints = { audio: true, video: false };

        recordButton.disabled = true;
        stopButton.disabled = false;
        pauseButton.disabled = false;

        // Timer başlamadıysa başlat
        if (!timerStarted) {
            startTimer(); // Timer'ı başlat
            timerStarted = true;
        }

        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(function (stream) {
                console.log(
                    "getUserMedia() success, stream created, initializing Recorder.js ..."
                );

                audioContext = new AudioContext();

                document.getElementById("formats").innerHTML =
                    "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

                if (recordTitle == 1) {
                    formatsElement.innerHTML += "<p><strong>Records</strong></p>";
                }

                gumStream = stream;

                input = audioContext.createMediaStreamSource(stream);

                rec = new Recorder(input, { numChannels: 1 });

                rec.record();

                console.log("Recording started");
            })
            .catch(function (err) {
                recordButton.disabled = false;
                stopButton.disabled = true;
                pauseButton.disabled = true;
            });
    }

    function startTimer() {
        // Timer'ı başlat
        var seconds = 0;
        timer = setInterval(function () {
            seconds++;
            var minutes = Math.floor(seconds / 60);
            var remainingSeconds = seconds % 60;
            timerDisplay.textContent =
                minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
        }, 1000);
    }

    function pauseRecording() {
        console.log("pauseButton clicked rec.recording=", rec.recording);
        if (rec.recording) {
            rec.stop();
            clearInterval(timer); // Timer'ı durdur
            pauseButton.style.backgroundColor = "#E5D301";
            pauseButton.style.color = "black";
            pauseButtonIcon.style.color = "black";
            event.preventDefault();
        } else {
            rec.record();
            // Timer'ı devam ettir
            var seconds = parseInt(timerDisplay.textContent.split(":")[1]);
            timer = setInterval(function () {
                seconds++;
                var minutes = Math.floor(seconds / 60);
                var remainingSeconds = seconds % 60;
                timerDisplay.textContent =
                    minutes + ":" + (remainingSeconds < 10 ? "0" : "") + remainingSeconds;
            }, 1000);
            pauseButton.style.backgroundColor = "grey";
            pauseButton.style.color = "white";
            pauseButtonIcon.style.color = "white";
            event.preventDefault();
        }
    }

    function stopRecording() {
        console.log("stopButton clicked");

        stopButton.disabled = true;
        recordButton.disabled = false;
        pauseButton.disabled = true;

        pauseButton.style.backgroundColor = "grey";
        pauseButton.style.color = "white";
        pauseButtonIcon.style.color = "white";

        rec.stop();

        clearInterval(timer); // Timer'ı durdur

        gumStream.getAudioTracks()[0].stop();

        rec.exportWAV(uploadRecording);

        // Timer'ı sıfırla ve başlatmaya hazır hale getir
        clearInterval(timer);
        timerDisplay.textContent = "0:00";
        timerStarted = false;

        addRecordsTitle();
    }

    function uploadRecording(blob) {
        var tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
        var localISOTime = new Date(Date.now() - tzoffset).toISOString();
        var filename = localISOTime;
        var fd = new FormData();
        fd.append("audio_data", blob, filename);

        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (this.readyState === 4) {
                console.log("Server returned: ", e.target.responseText);

                // Create audio element for playback
                var audio = document.createElement("audio");
                audio.className = "audioStyle";
                audio.controls = true;
                audio.src = "/records/" + filename + ".wav";

                // Create a form element
                var approvalForm = document.createElement("form");
                approvalForm.id = "approval-form";
                approvalForm.method = "POST";
                approvalForm.enctype = "multipart/form-data";

                // Create a submit button inside the form
                var submitButton = document.createElement("button");
                submitButton.id = "submitButton";
                submitButton.type = "submit";
                submitButton.textContent = "Approve";

                // Create a form element
                var deleteForm = document.createElement("form");
                deleteForm.id = "approval-form";
                deleteForm.method = "POST";
                deleteForm.enctype = "multipart/form-data";

                // Create a submit button inside the form
                var deleteButton = document.createElement("button");
                deleteButton.id = "deleteButton";
                deleteButton.type = "submit";
                deleteButton.textContent = "Delete";

                submitButton.addEventListener("click", function () {
                    // Add your approval logic here
                    console.log("Recording approved:", filename);
                    clearButtons();
                });

                deleteButton.addEventListener("click", function () {
                    // Add your delete logic here
                    deleteRecording(filename, audio.parentElement);
                    console.log("Recording deleted:", filename);
                    listItem.remove();
                });

                // Append the submit button and delete button to the form
                approvalForm.appendChild(submitButton);
                deleteForm.appendChild(deleteButton);

                // Create list item for the recording list
                var li = document.createElement("li");
                li.appendChild(audio);
                li.appendChild(approvalForm);
                li.appendChild(deleteForm);

                // Add the li element to the ol
                document.getElementById("recordingsList").appendChild(li);

                // Form elementini al
                var approvalForm2 = document.getElementById("approval-form");

                // Stems+MIDI formu elementini al
                var stemsMidiForm = document.getElementById("stems-midi-forms");

                // Only MIDI formu elementini al
                var onlyMidiForm = document.getElementById("only-midi-form");

                // Stems+MIDI formunun görünürlük durumunu kontrol et
                var isStemsMidiFormVisible = stemsMidiForm.style.display === "block";

                console.log(isStemsMidiFormVisible);

                // Eğer Stems+MIDI formu görünürse, formun action'ını değiştir
                if (isStemsMidiFormVisible) {
                    approvalForm2.action = "/from-record"; // approvalForm2'yi kullanın
                    console.log(
                        "Stems+MIDI Form action güncellendi: " + approvalForm2.action
                    );
                } else {
                    // Only MIDI formunun görünürlük durumunu kontrol et
                    var isOnlyMidiFormVisible = onlyMidiForm.style.display === "block";
                    console.log(isOnlyMidiFormVisible);

                    // Eğer Only MIDI formu görünürse, formun action'ını değiştir
                    if (isOnlyMidiFormVisible) {
                        approvalForm2.action = "/only-midi-from-record"; // approvalForm2'yi kullanın
                        console.log(
                            "Only MIDI Form action güncellendi: " + approvalForm2.action
                        );
                    }
                }
            }
        };

        xhr.open("POST", "/upload", true);
        xhr.send(fd);
    }

    function deleteRecording(filename, listItem) {
        // Endpoint'i çağır
        fetch("/delete_recording/" + filename + ".wav")
            .then((response) => response.text())
            .then((data) => {
                // İşlem başarılıysa list item'i kaldır
                if (data === "Delete successful!") {
                    listItem.remove();
                } else {
                    // İşlem başarısızsa bir hata mesajı göster
                    console.error("Delete operation failed:", data);
                }
            })
            .catch((error) => {
                console.error("Error during delete operation:", error);
            });

        // Sayfanın yeniden yüklenmesini engellemek için aşağıdaki satırı ekleyebilirsiniz
        event.preventDefault();
        return false;
    }

    function clearButtons() {
        var controlsDiv = document.getElementById("controls");
        controlsDiv.innerHTML = ""; // Clear all buttons
    }
});

function addRecordsTitle() {
    var formatsElement = document.getElementById("formats");
    var existingContent = formatsElement.innerHTML;
    var Content = formatsElement.innerHTML = "Format: start recording to see sample rate";
    formatsElement.innerHTML += "<p><strong>Records</strong></p>";
}

document
    .getElementById("local-upload-form")
    .addEventListener("change", function (event) {
        var selectedFileName = event.target.files[0].name;
        document.getElementById("secilenDosya").textContent =
            "Seçilen dosya: " + selectedFileName;
    });

document
    .getElementById("only-midi-local-upload-form")
    .addEventListener("change", function (event) {
        var selectedFileName = event.target.files[0].name;
        document.getElementById("secilenDosyaOnly").textContent =
            "Seçilen dosya: " + selectedFileName;
    });
