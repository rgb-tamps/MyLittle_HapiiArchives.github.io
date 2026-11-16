
const menuButton = document.getElementById("hamburgerButton");
const menu = document.getElementById("menu");

if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
        menu.classList.toggle("is-open", !isOpen);
    });

    menu.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("a")) {
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Open navigation");
            menu.classList.remove("is-open");
        }
    });
}

const photoTiles = Array.from(document.querySelectorAll(".card-image"));
const photoItems = Array.from(document.querySelectorAll("img, .card-image, video")).map((element) => {
    const isTile = element.classList.contains("card-image");
    const isVideo = element instanceof HTMLVideoElement;
    const tileImage = isTile
        ? getComputedStyle(element).backgroundImage.match(/url\((["']?)(.*?)\1\)/)
        : null;
    const videoSource = isVideo ? element.querySelector("source") : null;
    const source = tileImage
        ? tileImage[2]
        : isVideo
            ? element.currentSrc || (videoSource && videoSource.src) || element.src
            : element.currentSrc || element.src;
    const isListPhoto = !isVideo && source
        && source.toLowerCase().split(/[?#]/)[0].endsWith("/list.jpg");

    if (isTile && source) {
        const label = element.getAttribute("aria-label") || `Memory ${photoTiles.indexOf(element) + 1}`;
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", `View ${label}`);
    } else if (element instanceof HTMLImageElement && source) {
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", element.alt || "Open photo");
    }

    return { element, source, isVideo, isListPhoto };
}).filter((item) => item.source);
const photoNavigationItems = photoItems.filter((item) => !item.isVideo && !item.isListPhoto);
const videoNavigationItems = photoItems.filter((item) => item.isVideo);

if (photoItems.length) {
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = new URL("./gallery.css", document.currentScript.src).href;
    document.head.append(styleLink);

    const lightbox = document.createElement("dialog");
    lightbox.className = "photo-lightbox";
    lightbox.setAttribute("aria-label", "Photo viewer");
    lightbox.innerHTML = `
        <button class="lightbox-close" type="button" aria-label="Close photo viewer">&times;</button>
        <button class="lightbox-previous" type="button" aria-label="Previous photo">&lsaquo;</button>
        <figure>
            <img class="lightbox-image" alt="">
            <video class="lightbox-video" controls playsinline hidden></video>
            <figcaption class="lightbox-caption"></figcaption>
        </figure>
        <button class="lightbox-next" type="button" aria-label="Next photo">&rsaquo;</button>
    `;
    document.body.append(lightbox);

    const lightboxImage = lightbox.querySelector(".lightbox-image");
    const lightboxVideo = lightbox.querySelector(".lightbox-video");
    const caption = lightbox.querySelector(".lightbox-caption");
    const figure = lightbox.querySelector("figure");
    const previousButton = lightbox.querySelector(".lightbox-previous");
    const nextButton = lightbox.querySelector(".lightbox-next");
    let activeItems = photoNavigationItems;
    let activeIndex = 0;
    const listPhoto = photoItems.find((item) => item.isListPhoto);
    let listReader;

    if (listPhoto) {
        listReader = document.createElement("dialog");
        listReader.className = "list-reader";
        listReader.setAttribute("aria-label", "Scrollable keepsake photo");
        listReader.innerHTML = `
            <button class="list-reader-close" type="button" aria-label="Close list photo">&times;</button>
            <div class="list-reader-scroll" role="region" aria-label="Scroll through the keepsake photo" tabindex="0">
                <img class="list-reader-image" alt="A keepsake from our time together">
            </div>
        `;
        listReader.querySelector(".list-reader-image").src = listPhoto.source;
        document.body.append(listReader);
        listReader.querySelector(".list-reader-close").addEventListener("click", () => listReader.close());
        listReader.addEventListener("click", (event) => {
            if (event.target === listReader) listReader.close();
        });
    }

    const openListReader = () => {
        const readerScroll = listReader.querySelector(".list-reader-scroll");
        readerScroll.scrollTop = 0;
        listReader.showModal();
        readerScroll.focus();
    };

    const showPhoto = (index, items = activeItems) => {
        activeItems = items;
        if (!activeItems.length) return;

        activeIndex = (index + activeItems.length) % activeItems.length;
        const { element, source, isVideo } = activeItems[activeIndex];
        const label = element.getAttribute("aria-label")
            || element.getAttribute("alt")
            || element.textContent.trim()
            || `${isVideo ? "Video" : "Memory"} ${activeIndex + 1}`;

        lightboxVideo.pause();
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
        lightboxImage.hidden = isVideo;
        lightboxVideo.hidden = !isVideo;
        if (isVideo) {
            lightboxVideo.src = source;
            lightboxVideo.load();
        } else {
            lightboxImage.src = source;
            lightboxImage.alt = label;
        }
        lightboxImage.style.width = "";
        figure.scrollTop = 0;
        figure.scrollLeft = 0;
        previousButton.hidden = activeItems.length < 2;
        nextButton.hidden = activeItems.length < 2;
        caption.textContent = `${label} · ${activeIndex + 1} of ${activeItems.length}`;
    };

    let videoNumber = 0;
    photoItems.forEach((item, index) => {
        const { element, isVideo, isListPhoto } = item;
        if (isVideo) {
            videoNumber += 1;
            const openVideo = document.createElement("button");
            openVideo.className = "video-open";
            openVideo.type = "button";
            openVideo.setAttribute("aria-label", `Open video ${videoNumber} in viewer`);
            openVideo.textContent = "▶";
            element.parentElement.append(openVideo);
            openVideo.addEventListener("click", () => {
                showPhoto(videoNavigationItems.indexOf(photoItems[index]), videoNavigationItems);
                lightbox.showModal();
            });
            return;
        }

        element.addEventListener("click", () => {
            if (isListPhoto) {
                openListReader();
                return;
            }
            showPhoto(photoNavigationItems.indexOf(item), photoNavigationItems);
            lightbox.showModal();
        });

        if (element.getAttribute("role") === "button") {
            element.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (isListPhoto) {
                        openListReader();
                        return;
                    }
                    showPhoto(photoNavigationItems.indexOf(item), photoNavigationItems);
                    lightbox.showModal();
                }
            });
        }
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
    previousButton.addEventListener("click", () => showPhoto(activeIndex - 1));
    nextButton.addEventListener("click", () => showPhoto(activeIndex + 1));
    lightbox.addEventListener("keydown", (event) => {
        if (!lightboxVideo.hidden) return;
        if (event.key === "ArrowLeft") showPhoto(activeIndex - 1);
        if (event.key === "ArrowRight") showPhoto(activeIndex + 1);
    });
    lightbox.addEventListener("close", () => {
        lightboxVideo.pause();
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
    });
}

