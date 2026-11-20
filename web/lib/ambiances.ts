// Pages d'ambiance (famille D du brief SEO/GEO) : une page par ambiance existante, avec un contenu propre à chacune.
// Interdit : un même texte où seul le nom de l'ambiance change (contenu de masse). Le title vise ce que les gens tapent,
// l'URL garde le nom de l'ambiance. `bet: true` = correspondance requête/ambiance à confirmer avec les volumes réels.
import type { Page } from "./site";

export type Ambiance = {
  slug: string; preset: string; label: string; query: string; bet?: boolean;
  page: Page; h1: string; intro: string; tagline: string;
  palette: { colors: [string, string][]; text: string };
  typo: string; lieux: string; details: string;
  textes: { titre: string; texte: string }[];
  faq: [string, string][];
  guide: { path: string; label: string };
};

const page = (slug: string, title: string, description: string, ogTitle: string): Page =>
  ({ path: `/ambiances/${slug}/`, title, description, ogTitle, crumb: "", index: true, updated: "2026-11-20", priority: 0.8, og: "ambiance-" + slug });

const TEXTES_GUIDE = { path: "/guide/texte-faire-part-mariage/", label: "40 textes de faire-part de mariage à copier" };
const DIGITAL_GUIDE = { path: "/guide/faire-part-mariage-digital/", label: "Le faire-part de mariage digital : le guide complet" };
const RSVP_GUIDE = { path: "/guide/reponses-invites-mariage/", label: "Organiser les réponses de ses invités" };

export const AMBIANCES: Ambiance[] = [
  {
    slug: "champetre", preset: "champetre", label: "Champêtre", query: "faire-part mariage champêtre", tagline: "Kraft, feuillage et cachet sauge",
    page: page("champetre", "Faire-part mariage champêtre digital gratuit | Maison Meli",
      "Un faire-part de mariage champêtre digital : papier kraft, couronne de feuillage, cachet de cire sauge et réponses des invités intégrées. Gratuit.",
      "Faire-part de mariage champêtre, en version digitale"),
    h1: "Faire-part de mariage champêtre, en version digitale",
    intro: "Le faire-part de mariage champêtre de Maison Meli reprend les codes du mariage à la campagne : papier grainé, couronne de feuillage, vert sauge et cachet de cire. Il s’envoie par lien, s’ouvre comme une vraie enveloppe sur le téléphone de vos invités, et chacun répond en trente secondes. Création gratuite, sans carte bancaire.",
    palette: {
      colors: [["Lin", "#F6F2EA"], ["Sauge", "#8C9B7C"], ["Sauge profonde", "#5F6E4E"]],
      text: "La palette part d’un fond lin, presque écru, qui évoque le papier non blanchi. Le vert sauge, doux et légèrement grisé, colore les ornements et le cachet ; une version plus profonde sert aux titres pour garder un bon contraste à l’écran. Pas de dorure : l’encre suffit, comme sur un faire-part imprimé à la main. Si votre décoration tire vers l’olivier ou la lavande, la palette se change en un geste, le reste de l’ambiance ne bouge pas.",
    },
    typo: "Les prénoms sont composés en Cormorant Garamond, un caractère à empattements inspiré des Garamond de la Renaissance : il a le charme d’un livre ancien sans jamais faire daté. Les informations pratiques (horaires, adresse, réponse) passent en Mulish, une linéale ronde et très lisible sur petit écran, pour que vos grands-parents lisent l’heure de la cérémonie sans plisser les yeux.",
    lieux: "Cette ambiance a été dessinée pour les mariages en grange, en corps de ferme rénové, dans un domaine viticole ou sous les arbres d’un verger. Elle va aussi très bien avec une cérémonie laïque en plein air, un vin d’honneur dans une cour pavée ou un dîner sur de grandes tablées en bois. Si vous vous mariez en bord de rivière ou dans un moulin, ajoutez une photo du lieu : le format arrondi de l’ambiance la met en valeur sans l’enfermer.",
    details: "L’enveloppe est en papier kraft, fermée par un cachet de cire sauge gravé à vos initiales. Au premier toucher, le cachet se fend, le rabat s’ouvre et la carte glisse vers l’invité. La couronne de feuillage encadre vos prénoms ; le grain du papier reste visible sur toute la page. Le programme, le dress code et l’hébergement se rangent sous la carte, dans la même lumière douce.",
    textes: [
      { titre: "Simple et chaleureux", texte: "Entourés de leurs familles,\nLouise & Antoine\nont la joie de vous inviter à leur mariage\nle samedi 12 juin 2027 à 15 h,\nau Domaine des Tilleuls.\nLa fête se poursuivra autour d’un dîner sous les arbres." },
      { titre: "Esprit guinguette", texte: "Après dix ans à partager le même potager,\nLouise & Antoine se disent oui !\nRendez-vous le 12 juin 2027 à la Grange des Prés\npour la cérémonie, un apéro dans l’herbe\net une soirée à danser jusqu’au bout de la nuit." },
      { titre: "Avec les parents", texte: "Marie et Paul Lefèvre,\nSophie et Jean Moreau\nsont heureux de vous annoncer le mariage de leurs enfants\nLouise & Antoine\nqui sera célébré le 12 juin 2027 à 15 h\nen la mairie de Lourmarin,\npuis au Domaine des Tilleuls." },
    ],
    faq: [
      ["Le faire-part champêtre peut-il avoir une autre couleur que le vert ?", "Oui. L’ambiance règle d’un coup papier, typographie et ornements ; vous pouvez ensuite choisir une autre palette (olivier, terracotta, lavande, rose poudré…) sans perdre la couronne de feuillage ni l’enveloppe kraft."],
      ["Peut-on mettre une photo du lieu de réception ?", "Oui, jusqu’à trois photos. En ambiance champêtre, elles s’affichent avec des angles arrondis : une photo de la grange, du domaine ou de vous deux dans les champs fonctionne particulièrement bien."],
      ["Mes invités doivent-ils installer quelque chose pour l’ouvrir ?", "Non. Ils touchent le lien reçu sur WhatsApp, par SMS ou par e-mail, le faire-part s’ouvre dans leur navigateur et ils répondent directement dessus, sans compte ni application."],
      ["Ce style convient-il à un mariage civil seul, sans cérémonie religieuse ?", "Tout à fait. Le texte, le programme et les horaires sont entièrement modifiables : indiquez seulement la mairie et l’heure, ou ajoutez une cérémonie laïque dans le jardin du lieu de réception."],
    ],
    guide: TEXTES_GUIDE,
  },
  {
    slug: "boheme", preset: "boheme", label: "Bohème", query: "faire-part mariage bohème", tagline: "Terracotta, branches libres",
    page: page("boheme", "Faire-part mariage bohème digital gratuit | Maison Meli",
      "Un faire-part de mariage bohème digital : terracotta, branches libres, écriture manuscrite, arche pour la photo et réponses en ligne. Gratuit.",
      "Faire-part de mariage bohème, en version digitale"),
    h1: "Faire-part de mariage bohème, en version digitale",
    intro: "Le faire-part de mariage bohème de Maison Meli mise sur la chaleur : terracotta, branches qui débordent du cadre, écriture qui semble tracée au pinceau. Il part par un simple lien, vos invités ouvrent l’enveloppe sur leur téléphone et répondent sans quitter la page. Il est gratuit et reste modifiable jusqu’au jour J.",
    palette: {
      colors: [["Sable", "#FAF4EE"], ["Terracotta", "#D08B6C"], ["Brique", "#9A4E33"]],
      text: "Le fond sable rappelle le lin lavé et la céramique brute. La terracotta, entre l’argile et l’abricot, donne le ton aux ornements et au cachet ; une nuance brique, plus soutenue, porte les titres pour rester lisible en plein soleil. Pas de métal brillant : tout est mat, comme une poterie. Les couples qui préfèrent des teintes plus fraîches basculent souvent vers le rose poudré ou l’olivier, deux palettes qui gardent l’esprit libre de l’ambiance.",
    },
    typo: "Vos prénoms s’écrivent en Great Vibes, une écriture anglaise souple aux boucles généreuses, qui donne l’impression d’une calligraphie faite à la main la veille. Pour ne rien sacrifier à la lisibilité, toutes les informations utiles (date, adresse, programme) sont en Mulish : vos invités trouvent l’essentiel d’un coup d’œil, même dans la file d’attente d’un supermarché.",
    lieux: "L’ambiance bohème vit bien dehors : mariage dans un champ de lavande, sur une plage du Pays basque, dans une bastide aux volets délavés, sous une tente berbère ou un tipi, dans une serre remplie de plantes. Elle accompagne aussi les mariages en petit comité, les cérémonies laïques sous une arche de pampa et les week-ends entre amis où l’on dort sur place.",
    details: "La photo s’affiche en arche, la forme des portes de mas et des miroirs anciens. Des branches botaniques libres, sans symétrie forcée, entourent le texte. L’enveloppe se ferme par un cachet de cire terracotta à vos initiales, posé sur un papier légèrement texturé. Ajoutez la section « Dress code » si vous voulez du lin, des couleurs naturelles ou des pieds nus sur le sable : elle prend place sous la carte.",
    textes: [
      { titre: "Libre et joyeux", texte: "On a décidé de s’aimer pour de bon.\nInès & Malo\nvous invitent à fêter ça avec eux\nle 4 septembre 2027,\nsous les oliviers de la Bastide Rose.\nVenez comme vous êtes, avec vos plus beaux sourires." },
      { titre: "Week-end entre amis", texte: "Inès & Malo se marient !\nOn vous attend du vendredi 3 au dimanche 5 septembre 2027\nau Mas des Cigales pour trois jours de fête,\nde baignades et de longues tablées.\nPrévoyez maillot, chapeau et chaussures pour danser." },
      { titre: "Plus classique", texte: "Inès Garnier et Malo Robin\nont le bonheur de vous convier à leur mariage\nqui sera célébré le samedi 4 septembre 2027 à 16 h\nà la Bastide Rose, à Lourmarin.\nUne réception suivra la cérémonie." },
    ],
    faq: [
      ["Peut-on préciser un dress code bohème sur le faire-part ?", "Oui. Activez la section « Dress code » et écrivez simplement ce que vous souhaitez : tenues claires, lin, couleurs naturelles, chaussures plates pour la pelouse. Elle s’affiche sous la carte, au même titre que le programme."],
      ["Le faire-part fonctionne-t-il pour un mariage sur plusieurs jours ?", "Oui. Le programme accepte plusieurs moments avec leur horaire, et vous pouvez demander aux invités s’ils seront présents au brunch du lendemain. La section « Hébergement » sert à indiquer où dormir."],
      ["L’écriture manuscrite reste-t-elle lisible sur un petit téléphone ?", "Seuls les prénoms utilisent l’écriture manuscrite, en grand. Tout le reste est composé dans une police simple et nette, choisie pour être lue facilement sur mobile."],
      ["Puis-je changer la terracotta pour une couleur plus douce ?", "Oui. Gardez l’ambiance bohème et choisissez le rose poudré, l’olivier ou le sable dans les palettes : l’arche, les branches et l’écriture restent en place."],
    ],
    guide: DIGITAL_GUIDE,
  },
  {
    slug: "romantique", preset: "romantique", label: "Romantique", query: "faire-part mariage romantique", tagline: "Papier coton, or rose",
    page: page("romantique", "Faire-part mariage romantique digital gratuit | Maison Meli",
      "Un faire-part de mariage romantique digital : papier coton, rose poudré, détails en or rose, écriture calligraphiée et réponses en ligne. Gratuit.",
      "Faire-part de mariage romantique, en version digitale"),
    h1: "Faire-part de mariage romantique, en version digitale",
    intro: "Le faire-part de mariage romantique de Maison Meli joue la douceur : papier coton, rose poudré, fleurs fines et reflets d’or rose qui bougent avec le téléphone. Vos invités l’ouvrent depuis un lien, découvrent la carte et vous répondent dans la foulée. Gratuit, il se crée en quelques minutes.",
    palette: {
      colors: [["Coton", "#FAF3F0"], ["Rose poudré", "#CE968C"], ["Vieux rose", "#9A5A50"]],
      text: "Le fond rappelle un papier de coton à peine rosé. Le rose poudré colore les ornements et le cachet ; un vieux rose plus dense prend les titres et les boutons, assez contrasté pour être lu en plein jour. La dorure or rose, la vraie signature de l’ambiance, capte la lumière : sur téléphone, son reflet suit l’inclinaison de l’écran ou le doigt de l’invité. Préférez-vous un rose plus franc ou un bordeaux ? Les palettes se changent sans toucher au reste.",
    },
    typo: "Les prénoms prennent la Great Vibes, une écriture déliée aux grandes boucles qui fait penser aux invitations calligraphiées à la plume. Le reste du texte est en Mulish, sobre et aérée : le contraste entre les deux donne cette impression de carte précieuse, sans que l’adresse de la réception devienne un exercice de déchiffrage.",
    lieux: "Cette ambiance accompagne les mariages en orangerie, dans un jardin de roses, une chapelle de campagne, un hôtel particulier aux moulures claires ou une maison de famille au bord d’un lac. Elle convient aussi très bien aux mariages au printemps, quand les pivoines et les roses anciennes sont de sortie, et aux réceptions où les fleurs sont la décoration principale.",
    details: "La photo s’affiche dans une arche, qui adoucit un portrait de couple. Des motifs botaniques fins accompagnent les prénoms et les filets sont en or rose. L’enveloppe se scelle avec un cachet de cire rose à vos initiales. Pour aller plus loin, la section « Notre histoire » permet de raconter votre rencontre en quelques lignes : c’est souvent la partie que les invités relisent.",
    textes: [
      { titre: "Tendre", texte: "Il y a des rencontres qui changent une vie.\nLéa & Gabriel\nont la joie de vous inviter à leur mariage\nle samedi 15 mai 2027 à 15 h 30,\nà l’Orangerie du Château de Belval.\nVotre présence rendra ce jour encore plus beau." },
      { titre: "Citation", texte: "« Aimer, ce n’est point se regarder l’un l’autre,\nc’est regarder ensemble dans la même direction. »\nAntoine de Saint-Exupéry\n\nLéa & Gabriel se marient\nle 15 mai 2027 à l’Orangerie de Belval,\net seraient heureux de vous y voir." },
      { titre: "Classique", texte: "Madame Claire Dubois\net Monsieur et Madame Henri Martin\nsont heureux de vous faire part du mariage de\nLéa & Gabriel\nle samedi 15 mai 2027 à 15 h 30\nen l’église Saint-Pierre de Belval." },
    ],
    faq: [
      ["L’or rose est-il vraiment animé ?", "Oui, sur téléphone le reflet de la dorure suit l’inclinaison de l’écran, ou le doigt en l’absence de capteur. Si l’invité a réduit les animations dans les réglages de son appareil, la dorure reste fixe."],
      ["Peut-on écrire un texte long sur notre histoire ?", "Oui. La section « Notre histoire » accueille quelques paragraphes sous la carte principale ; le faire-part lui-même reste court et lisible, l’histoire est là pour ceux qui veulent en savoir plus."],
      ["Le faire-part romantique est-il adapté à un mariage religieux ?", "Oui. Le texte est libre : indiquez l’église, la synagogue ou le temple, l’heure de la cérémonie, puis le lieu de réception dans le programme."],
      ["Peut-on garder le style mais retirer la photo ?", "Oui, les photos sont facultatives. Sans photo, les ornements et les prénoms occupent la carte, ce qui donne un rendu plus papeterie."],
    ],
    guide: TEXTES_GUIDE,
  },
  {
    slug: "minimaliste", preset: "minimaliste", label: "Minimaliste", query: "faire-part mariage minimaliste", tagline: "Lignes nettes, air marin",
    page: page("minimaliste", "Faire-part mariage minimaliste digital gratuit | Maison Meli",
      "Un faire-part de mariage minimaliste et épuré digital : lignes nettes, bleu marin, typographie moderne, photo ronde et réponses en ligne. Gratuit.",
      "Faire-part de mariage minimaliste, en version digitale"),
    h1: "Faire-part de mariage minimaliste, en version digitale",
    intro: "Le faire-part de mariage minimaliste de Maison Meli dit l’essentiel et rien de plus : vos prénoms, la date, le lieu, beaucoup d’air autour. Pas d’ornement, une typographie moderne et un bleu marin très doux. Il s’envoie par lien, s’ouvre sur téléphone et recueille les réponses de vos invités. Gratuit.",
    palette: {
      colors: [["Écume", "#F3F7F8"], ["Bleu Riviera", "#7FA8B6"], ["Bleu marine", "#3B6876"]],
      text: "Le fond écume, un blanc à peine bleuté, évite la dureté du blanc pur sur un écran. Le bleu Riviera se fait discret : un filet, un cachet, un bouton. Le bleu marine, plus profond, porte les titres. Aucune dorure, aucune texture de papier : le minimalisme passe par l’espace et la qualité de la typographie. Si vous préférez un épuré plus chaud, la palette lin ou ivoire donne le même calme dans des tons crème.",
    },
    typo: "Les prénoms sont en Josefin Sans fine, une linéale géométrique aux capitales élancées, inspirée des affiches des années 1920 mais très actuelle. Les informations sont en Lato, neutre et parfaitement lisible. Le contraste vient des tailles et des espacements, pas des fioritures : c’est ce qui donne au faire-part épuré son allure de papeterie contemporaine.",
    lieux: "Ce style convient aux mariages en ville, dans un loft, une galerie d’art ou un restaurant à la carte courte et précise, mais aussi aux mariages en bord de mer, sur une terrasse face à l’océan ou dans une villa blanche. Il plaît aux couples qui veulent un mariage intime, à la mairie puis au restaurant, et à ceux qui ont horreur du « trop ».",
    details: "La photo s’affiche dans un cercle parfait, comme un hublot. Pas d’ornement autour des prénoms : la mise en page repose sur un alignement centré et des marges généreuses. L’enveloppe reste présente, avec un cachet de cire bleu à vos initiales, pour garder le petit moment d’ouverture. Vous pouvez aussi choisir de supprimer l’enveloppe et afficher directement la carte.",
    textes: [
      { titre: "L’essentiel", texte: "Emma & Hugo\nse marient.\n\nSamedi 18 septembre 2027\n16 h\nVilla Ondine, Cambo-les-Bains" },
      { titre: "Mairie et dîner", texte: "Emma & Hugo\nvous invitent à leur mariage\nle 18 septembre 2027.\nMairie du 11e arrondissement à 14 h,\npuis dîner au Comptoir des Halles à 19 h 30." },
      { titre: "Petit comité", texte: "Nous nous marions, entourés de quelques personnes qui comptent.\nVous en faites partie.\nEmma & Hugo\n18 septembre 2027, Biarritz." },
    ],
    faq: [
      ["Peut-on retirer complètement l’enveloppe ?", "Oui. Dans les réglages d’ouverture, choisissez « Aucune » : la carte s’affiche directement. Vous pouvez aussi opter pour un simple monogramme de vos initiales avant la carte."],
      ["Un faire-part épuré, ce n’est pas trop froid ?", "Le fond n’est pas d’un blanc pur, le bleu est adouci, et rien ne vous empêche d’ajouter une photo ou un mot personnel. L’épure enlève le superflu, pas la chaleur."],
      ["Le style minimaliste fonctionne-t-il pour un mariage religieux ?", "Oui, le texte et le programme sont libres. La sobriété de la mise en page convient d’ailleurs très bien à une cérémonie solennelle."],
      ["Peut-on changer de police tout en restant minimaliste ?", "Oui. Huit typographies sont disponibles : l’éditoriale (Playfair Display) ou la moderne (DM Serif Display) gardent un rendu épuré avec plus de caractère."],
    ],
    guide: DIGITAL_GUIDE,
  },
  {
    slug: "elegance", preset: "elegance", label: "Élégance", query: "faire-part mariage chic", tagline: "Bleu nuit, filets dorés",
    page: page("elegance", "Faire-part mariage chic et élégant, digital | Maison Meli",
      "Un faire-part de mariage chic et élégant digital : bleu nuit, filets dorés, typographie haute couture, enveloppe scellée et réponses en ligne. Gratuit.",
      "Faire-part de mariage chic et élégant, en digital"),
    h1: "Faire-part de mariage chic et élégant, en version digitale",
    intro: "Le faire-part de mariage chic de Maison Meli s’inspire des cartons d’invitation de soirée : fond bleu nuit, filets dorés, typographie de magazine de mode. Il convient aux réceptions habillées et aux mariages du soir. Vos invités l’ouvrent par un lien et répondent sur la carte. La création est gratuite.",
    palette: {
      colors: [["Bleu nuit", "#1F2433"], ["Or pâle", "#C9A86A"], ["Or clair", "#E2C58A"]],
      text: "Ici, le fond est sombre : un bleu nuit profond, plus doux que le noir, qui fait ressortir l’or. Les filets, le cadre et le cachet sont dorés ; une nuance d’or plus claire assure la lisibilité des titres sur fond foncé. La dorure est animée : sur téléphone, un reflet glisse sur les lettres quand l’invité incline l’écran. Si vous préférez la lumière, la palette ivoire garde toute l’élégance sur fond clair.",
    },
    typo: "Les prénoms sont en Bodoni Moda, un caractère à fort contraste de pleins et de déliés, celui des couvertures de magazines de mode et des grandes maisons de couture. Les informations pratiques passent en Mulish, discrète, pour que la hiérarchie reste nette : le nom des mariés frappe, l’adresse se lit sans effort.",
    lieux: "Cette ambiance accompagne les mariages en hôtel particulier, dans un palace, sur un toit parisien, dans un salon de réception aux lustres en cristal ou un restaurant gastronomique. Elle est faite pour les réceptions du soir, les dîners assis, les dress codes « tenue de soirée » ou « black tie » et les mariages d’hiver en ville.",
    details: "Un cadre fin entoure la carte, comme sur un carton gravé. La photo, aux angles arrondis, prend place sous le texte. L’enveloppe se ferme par un cachet de cire doré à vos initiales. Indiquez un dress code précis dans la section dédiée : c’est particulièrement apprécié pour une soirée habillée, où les invités veulent savoir s’il faut sortir le smoking.",
    textes: [
      { titre: "Soirée habillée", texte: "Charlotte & Alexandre\nvous prient de leur faire l’honneur de votre présence\nà leur mariage\nle samedi 9 octobre 2027 à 18 h,\nà l’Hôtel de Valmont, Paris.\nTenue de soirée souhaitée." },
      { titre: "Formel, avec les familles", texte: "Monsieur et Madame Louis de Saint-Aubin\nMonsieur et Madame Marc Berthier\nont l’honneur de vous faire part du mariage de leurs enfants\nCharlotte & Alexandre\nqui sera célébré le samedi 9 octobre 2027 à 16 h\nen l’église Saint-Louis de Paris." },
      { titre: "Élégant et sobre", texte: "Charlotte & Alexandre\nse marient le 9 octobre 2027.\nCérémonie à 17 h, dîner à 20 h,\nau Pavillon des Lilas.\nNous espérons vous compter parmi nous." },
    ],
    faq: [
      ["Un faire-part chic peut-il vraiment être digital ?", "Oui, à condition que le rendu soit soigné : typographie de qualité, dorure, mise en page sobre. Le format digital ajoute ce que le papier n’offre pas, comme l’ajout à l’agenda, le plan d’accès et la réponse en un geste."],
      ["Comment indiquer « tenue de soirée » ?", "Activez la section « Dress code » et écrivez-le en toutes lettres. Vous pouvez préciser une couleur à éviter ou un thème ; la mention apparaît sous la carte."],
      ["Le fond sombre est-il lisible pour tout le monde ?", "Les textes sont dorés clair ou blancs sur bleu nuit, avec un contraste contrôlé. Si une partie de vos invités lit mal sur fond foncé, la palette ivoire offre le même style sur fond clair."],
      ["Peut-on envoyer le faire-part chic aussi en version papier ?", "Maison Meli est 100 % digital et n’imprime pas. Pour quelques invités sans téléphone, vous pouvez montrer le QR code du faire-part ou leur transmettre l’essentiel de vive voix."],
    ],
    guide: TEXTES_GUIDE,
  },
  {
    slug: "chateau", preset: "chateau", label: "Château", query: "faire-part mariage château", bet: true, tagline: "Vergé ivoire, dorure à chaud",
    page: page("chateau", "Faire-part mariage château digital gratuit | Maison Meli",
      "Un faire-part de mariage au château digital : papier vergé ivoire, calligraphie, dorure, cadre classique et réponses des invités en ligne. Gratuit.",
      "Faire-part de mariage au château, en version digitale"),
    h1: "Faire-part de mariage au château, en version digitale",
    intro: "Le faire-part de mariage château de Maison Meli reprend l’art de la papeterie traditionnelle : papier vergé ivoire, calligraphie à la plume, cadre fin et dorure. Il est pensé pour les réceptions dans un château, un manoir ou une demeure historique. Il part en un lien, s’ouvre comme une lettre cachetée et recueille les réponses. Gratuit.",
    palette: {
      colors: [["Ivoire", "#FBF8F1"], ["Or ancien", "#C2A468"], ["Bronze", "#7E6328"]],
      text: "Le fond ivoire évoque un papier vergé, avec ses fines lignes de fabrication visibles dans le grain. L’or ancien habille le cadre, les filets et le cachet ; une nuance bronze, plus sombre, garantit la lisibilité des titres. La dorure est animée sur téléphone : un reflet passe sur les lettres quand l’invité incline l’écran, comme sur une dorure à chaud qu’on tourne dans la lumière.",
    },
    typo: "Vos prénoms sont calligraphiés en Pinyon Script, une écriture anglaise inspirée des modèles de calligraphie du XIXᵉ siècle, aux pleins et déliés très marqués. Tout le reste est composé en Mulish, sobre : le contraste entre la plume et le texte courant donne la solennité d’un faire-part gravé, sans sacrifier la lisibilité des horaires.",
    lieux: "L’ambiance accompagne les mariages dans un château de la Loire, un manoir normand, une abbaye, une demeure du XVIIIᵉ siècle, une bastide de maître ou un domaine avec parc à la française. Elle convient aux cérémonies religieuses dans la chapelle du domaine, aux vins d’honneur dans la cour d’honneur et aux dîners dans une orangerie.",
    details: "Un cadre classique entoure la carte ; la photo prend la forme d’une arche, comme une fenêtre de château. L’enveloppe se ferme par un cachet de cire doré à vos initiales. C’est l’ambiance où la section « Hébergement » est la plus utile : les châteaux sont souvent à la campagne, et vos invités apprécieront la liste des chambres d’hôtes et des hôtels proches.",
    textes: [
      { titre: "Traditionnel", texte: "Monsieur et Madame Bertrand de La Roche\nMonsieur et Madame François Lemaire\nsont heureux de vous faire part du mariage de leurs enfants\nAgathe & Victor\nqui sera célébré le samedi 26 juin 2027 à 15 h\nen la chapelle du Château de Montrevel.\nUne réception suivra au château." },
      { titre: "Les mariés invitent", texte: "Agathe & Victor\nont la joie de vous convier à leur mariage\nle samedi 26 juin 2027 à 15 h\nau Château de Montrevel.\nAprès la cérémonie, vin d’honneur dans les jardins\net dîner dans l’orangerie." },
      { titre: "Avec une citation", texte: "« Là où il y a de l’amour, il y a de la vie. »\nGandhi\n\nAgathe & Victor\nvous attendent le 26 juin 2027\nau Château de Montrevel\npour célébrer leur union." },
    ],
    faq: [
      ["Comment indiquer les hôtels autour du château ?", "Activez la section « Hébergement » : vous y écrivez les adresses et ajoutez un lien de réservation. Elle apparaît sous la carte, à côté du programme et des infos pratiques."],
      ["Peut-on demander qui reste au brunch du lendemain ?", "Oui. Dans les questions posées aux invités, cochez « Brunch du lendemain » : la réponse apparaît dans votre tableau de suivi, avec le total des présents."],
      ["La calligraphie est-elle lisible pour les noms longs ?", "Les prénoms sont affichés en grand et la taille s’adapte à leur longueur. Pour des noms composés, vous pouvez aussi choisir une typographie plus droite comme l’éditoriale ou la haute couture."],
      ["Le style château convient-il à un mariage en hiver ?", "Oui. Le fond ivoire et la dorure fonctionnent en toute saison. Pour une ambiance plus feutrée, l’ambiance Jardin d’hiver propose un vert émeraude profond avec la même dorure."],
    ],
    guide: RSVP_GUIDE,
  },
  {
    slug: "gatsby", preset: "gatsby", label: "Gatsby", query: "faire-part mariage Gatsby", bet: true, tagline: "Noir laqué, éventail art déco",
    page: page("gatsby", "Faire-part mariage Gatsby art déco, digital | Maison Meli",
      "Un faire-part de mariage Gatsby digital : noir laqué, éventails art déco, dorure animée, esprit années 20 et réponses des invités en ligne. Gratuit.",
      "Faire-part de mariage Gatsby, esprit années 20"),
    h1: "Faire-part de mariage Gatsby, esprit années 20",
    intro: "Le faire-part de mariage Gatsby de Maison Meli plonge vos invités dans les années 20 : noir laqué, éventails art déco, lettres hautes et dorure qui scintille. C’est l’invitation idéale pour un mariage festif, un thème rétro ou une soirée habillée. Il part par lien, s’ouvre sur téléphone et recueille les réponses. Gratuit.",
    palette: {
      colors: [["Noir laqué", "#141414"], ["Or", "#C9A86A"], ["Champagne", "#E2C58A"]],
      text: "Le fond noir laqué donne immédiatement le ton de la soirée. L’or, inspiré des façades art déco et des verres à champagne, dessine les éventails, les filets géométriques et le cachet ; une teinte champagne plus claire porte les titres pour rester lisible. La dorure est animée : sur téléphone, le reflet suit l’inclinaison de l’écran, comme une paillette qui accroche la lumière.",
    },
    typo: "Les prénoms sont en Italiana, un caractère fin aux lettres hautes et étroites, typique des affiches et des enseignes des années 1920. Les informations pratiques utilisent Jost, une linéale géométrique héritée du Futura, qui prolonge l’esprit Bauhaus de l’époque tout en restant très lisible sur un écran de téléphone.",
    lieux: "Ce style est fait pour les mariages dans un hôtel des années folles, un ancien cinéma, un club de jazz, une brasserie à la décoration d’époque, une villa sur la Côte d’Azur ou une salle de bal. Il accompagne aussi les mariages à thème rétro, avec orchestre swing, bar à cocktails et photobooth à plumes.",
    details: "Des éventails et des motifs géométriques art déco encadrent vos prénoms, la photo s’affiche avec des angles doux. L’enveloppe noire se ferme par un cachet de cire doré à vos initiales. La section « Dress code » est presque obligatoire ici : robes à franges, plumes, nœuds papillon ou costumes trois-pièces, dites à vos invités jusqu’où ils peuvent aller.",
    textes: [
      { titre: "Soirée années 20", texte: "Champagne, jazz et paillettes.\nJoséphine & Arthur\nvous invitent à leur mariage\nle samedi 20 novembre 2027 à 19 h\nau Grand Hôtel des Anges, Nice.\nTenue années folles vivement encouragée." },
      { titre: "Élégant", texte: "Joséphine & Arthur\nont le plaisir de vous convier à leur mariage\nle samedi 20 novembre 2027.\nCérémonie à 17 h, cocktail et dîner dansant à suivre\nau Grand Salon de l’Hôtel des Anges." },
      { titre: "Fête", texte: "Sortez vos plumes et vos nœuds papillon :\nJoséphine & Arthur se marient !\nRendez-vous le 20 novembre 2027 pour une nuit\nà danser le charleston jusqu’au petit matin." },
    ],
    faq: [
      ["Peut-on préciser un thème années 20 aux invités ?", "Oui. La section « Dress code » vous permet d’écrire le thème et des idées de tenues ; elle apparaît clairement sous la carte."],
      ["Le style Gatsby convient-il à un mariage de jour ?", "Il est pensé pour le soir, mais rien ne l’interdit. Pour un mariage de jour dans le même esprit, l’ambiance Élégance, en bleu nuit et or, est un peu plus sobre."],
      ["Peut-on mettre une photo en noir et blanc ?", "Oui, et c’est même un très bon choix avec ce fond noir laqué. Vous pouvez ajouter jusqu’à trois photos."],
      ["La dorure animée ralentit-elle le téléphone des invités ?", "Non. L’effet est léger et s’arrête si l’appareil demande de réduire les animations. Le faire-part reste rapide à ouvrir, même sur un téléphone ancien."],
    ],
    guide: TEXTES_GUIDE,
  },
  {
    slug: "jardin-d-hiver", preset: "emeraude", label: "Jardin d’hiver", query: "faire-part mariage hiver", bet: true, tagline: "Velours émeraude, couronne dorée",
    page: page("jardin-d-hiver", "Faire-part mariage d’hiver digital gratuit | Maison Meli",
      "Un faire-part de mariage d’hiver digital : velours émeraude, couronne de feuillage dorée, typographie éditoriale et réponses en ligne. Gratuit.",
      "Faire-part de mariage d’hiver : Jardin d’hiver"),
    h1: "Faire-part de mariage d’hiver : l’ambiance Jardin d’hiver",
    intro: "Le faire-part Jardin d’hiver de Maison Meli est pensé pour les mariages de la saison froide : vert émeraude profond comme un velours, couronne de feuillage dorée, typographie de magazine. Il se partage en un lien, s’ouvre sur téléphone comme une enveloppe et réunit toutes les réponses. Gratuit.",
    palette: {
      colors: [["Émeraude", "#133A31"], ["Or", "#C9A86A"], ["Or clair", "#E2C58A"]],
      text: "Le fond émeraude, très sombre, rappelle le velours des fauteuils de salon et les sapins sous la neige. L’or dessine la couronne de feuillage et le cachet ; un or plus clair porte les titres et assure le contraste. Sur téléphone, la dorure brille et suit l’inclinaison de l’écran : un petit éclat de fête au milieu de l’hiver. Pour un hiver plus clair, la palette ivoire garde la couronne dorée sur fond crème.",
    },
    typo: "Les prénoms sont composés en Playfair Display, un caractère éditorial à fort contraste, élégant en grand et chaleureux dans ses italiques. Les informations pratiques sont en Mulish, ronde et lisible. Le duo donne un rendu de papeterie de fêtes, à la fois chic et accueillant.",
    lieux: "L’ambiance accompagne les mariages en décembre, janvier ou février : chalet de montagne, chartreuse avec cheminée, château entouré de forêt, serre chauffée, hôtel de ville illuminé, salle voûtée aux bougies. Elle convient aussi aux mariages autour des fêtes de fin d’année, quand les invités sont déjà réunis.",
    details: "Une couronne de feuillage dorée entoure les prénoms ; la photo s’affiche en arche. L’enveloppe se ferme par un cachet de cire doré à vos initiales. En hiver, deux sections font la différence : « Infos pratiques » pour les routes, les parkings et le vestiaire, et « Hébergement » si le lieu est loin d’une gare. Le compte à rebours, lui, rappelle aux invités que la date approche malgré les fêtes.",
    textes: [
      { titre: "Hiver chaleureux", texte: "Au cœur de l’hiver, nous allumons la plus belle des flammes.\nClara & Nathan\nvous invitent à leur mariage\nle samedi 15 janvier 2028 à 15 h\nau Chalet des Neiges, Megève.\nPrévoyez vos plus beaux pulls." },
      { titre: "Entre les fêtes", texte: "Clara & Nathan\nont la joie de vous inviter à leur mariage\nle jeudi 30 décembre 2027 à 16 h\nau Château de la Forêt.\nUne raison de plus de faire la fête avant le Nouvel An !" },
      { titre: "Classique", texte: "Madame et Monsieur Pierre Lambert\nMadame et Monsieur Olivier Roux\nsont heureux de vous faire part du mariage de\nClara & Nathan\nle samedi 15 janvier 2028 à 15 h\nen l’église Saint-Jean-Baptiste de Megève." },
    ],
    faq: [
      ["Quand envoyer un faire-part pour un mariage en hiver ?", "Comptez au moins trois mois avant, et plus tôt encore si le mariage tombe pendant les fêtes : vos invités organisent leurs vacances de fin d’année longtemps à l’avance. Un save the date six à huit mois avant est recommandé."],
      ["Peut-on indiquer des conseils pour la route ou la neige ?", "Oui. La section « Infos pratiques » sert exactement à ça : routes, équipements, parkings, navettes. Le bouton vers le plan d’accès s’ouvre dans l’application de cartes de l’invité."],
      ["L’émeraude est-il lisible sur tous les écrans ?", "Les textes sont en or clair sur fond très sombre, avec un contraste contrôlé. Si vous préférez un fond clair, gardez l’ambiance et choisissez la palette ivoire."],
      ["Ce style convient-il à un mariage de Noël ?", "Oui, le vert profond et l’or évoquent naturellement les fêtes sans tomber dans le sapin et les boules. Ajoutez une photo d’hiver pour renforcer le thème."],
    ],
    guide: RSVP_GUIDE,
  },
  {
    slug: "porcelaine", preset: "porcelaine", label: "Porcelaine", query: "faire-part mariage bleu et blanc", bet: true, tagline: "Blanc émaillé, bleu de four",
    page: page("porcelaine", "Faire-part mariage bleu et blanc, digital | Maison Meli",
      "Un faire-part de mariage bleu et blanc digital : blanc émaillé, bleu de four, filets argentés, photo ronde et réponses des invités en ligne. Gratuit.",
      "Faire-part de mariage bleu et blanc : Porcelaine"),
    h1: "Faire-part de mariage bleu et blanc : l’ambiance Porcelaine",
    intro: "Le faire-part Porcelaine de Maison Meli s’inspire de la vaisselle ancienne : un blanc émaillé, un bleu profond comme celui des faïences et des filets argentés. C’est un faire-part de mariage bleu et blanc, frais et raffiné, qui s’envoie par lien et recueille les réponses de vos invités. Gratuit.",
    palette: {
      colors: [["Blanc émaillé", "#F6F8FB"], ["Bleu de four", "#2F4C8C"], ["Argent", "#7E858C"]],
      text: "Le fond blanc légèrement bleuté rappelle l’émail d’une assiette ancienne. Le bleu de four, un bleu cobalt profond, colore le cadre, les titres et le cachet : c’est la couleur des faïences de Delft, de Gien ou des azulejos portugais. Les filets sont argentés et leur reflet bouge sur téléphone. Une palette très lisible, qui fonctionne aussi bien en été qu’en hiver.",
    },
    typo: "Les prénoms sont composés en Playfair Display, dont les contrastes rappellent les lettres peintes sur la vaisselle de collection. Le texte courant est en Mulish. Le tout donne une impression de carte de table soignée, idéale pour un dîner où la vaisselle et les fleurs bleues sont au centre de la décoration.",
    lieux: "Ce style accompagne les mariages en bord de mer (Bretagne, île de Ré, Grèce, Portugal), dans une maison de maître aux volets bleus, une orangerie, une villa méditerranéenne ou une salle décorée de vaisselle chinée. Il plaît aux couples qui préparent une décoration bleue et blanche, avec des hortensias, des agapanthes ou du delphinium.",
    details: "Un cadre fin, comme le liseré d’une assiette, entoure la carte ; la photo s’affiche dans un cercle. L’enveloppe se scelle avec un cachet de cire bleu à vos initiales. Si votre mariage a lieu sur une île ou loin de chez vos invités, la section « Infos pratiques » sert à indiquer les traversées, les horaires de bateau ou les navettes.",
    textes: [
      { titre: "Bord de mer", texte: "Face à l’océan, nous nous dirons oui.\nMathilde & Lucas\nvous invitent à leur mariage\nle samedi 3 juillet 2027 à 16 h\nà la Villa des Embruns, île de Ré." },
      { titre: "Raffiné", texte: "Mathilde & Lucas\nont le plaisir de vous convier à leur mariage\nle samedi 3 juillet 2027.\nCérémonie à 16 h à la mairie de Saint-Martin-de-Ré,\npuis dîner à la Villa des Embruns." },
      { titre: "Avec les parents", texte: "Monsieur et Madame Yves Le Goff\nMonsieur et Madame Thierry Girard\nsont heureux de vous annoncer le mariage de\nMathilde & Lucas\nle samedi 3 juillet 2027 à 15 h\nen l’église Saint-Martin, île de Ré." },
    ],
    faq: [
      ["Peut-on choisir un autre bleu ?", "Oui. Gardez l’ambiance Porcelaine et choisissez la palette Riviera pour un bleu plus clair et marin, ou Bleu nuit pour un fond sombre et doré."],
      ["Les filets argentés bougent-ils vraiment ?", "Oui, sur téléphone le reflet de l’argent suit l’inclinaison de l’écran ou le doigt. L’effet s’arrête si l’appareil demande de réduire les animations."],
      ["Le style convient-il à un mariage à l’étranger ?", "Oui. Indiquez le lieu, les horaires et les informations de voyage dans les sections « Infos pratiques » et « Hébergement » ; le bouton de plan s’ouvre dans l’application de cartes de l’invité."],
      ["Peut-on demander les allergies et régimes des invités ?", "Oui, c’est une question que vous activez en un geste. Les réponses sont regroupées dans votre tableau de suivi, prêtes à envoyer au traiteur."],
    ],
    guide: RSVP_GUIDE,
  },
];

for (const a of AMBIANCES) a.page.crumb = a.label;
export const ambianceBySlug = (slug: string) => AMBIANCES.find((a) => a.slug === slug);
