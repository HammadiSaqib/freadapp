Object.defineProperty(navigator, "languages", {
    get: function () {
        return ["en-US", "en"];
    }
});

// overwrite the `plugins` property to use a custom getter
Object.defineProperty(navigator, 'plugins', {
    get: function () {
        // this just needs to have `length > 0`, but we could mock the plugins too
        return [1, 2, 3, 4, 5];
    },
});

Object.defineProperty(navigator, 'webdriver', { get: () => false, });

function getOverview() {
    var overview = {};
    var list = document.querySelectorAll(".websiteHeader-companyInfoList li");
    list.forEach(function (ele) {
        switch (ele.querySelector('h4').innerText) {
            case "Year Founded":
                overview.year_founded = ele.querySelector('p').innerText;
                break;
            case "Headquarters":
                overview.headquarters = ele.querySelector('p').innerText;
                break;
            case "Estimated Employees":
                overview.estimated_employees = ele.querySelector('p').innerText;
                break;
        }
    });
    var social = [];
    list = document.querySelectorAll(".socialList li");
    list.forEach(function (elem) {
        social.push({
            type: elem.querySelector("a").innerText,
            value: elem.querySelector(".socialItem-value").innerText,
            icon: elem.querySelector("img").dataset.original
        });
    });
    overview.social = social;
    return overview;
}