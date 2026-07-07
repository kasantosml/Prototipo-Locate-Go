const tema =
localStorage.getItem("temaAtual");

if(tema === "dark"){

    document.documentElement
    .setAttribute(
        "data-theme",
        "dark"
    );

}
else{

    document.documentElement
    .removeAttribute(
        "data-theme"
    );

}