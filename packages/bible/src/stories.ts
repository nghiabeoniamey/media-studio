/**
 * Curated index of well-known passages for grounding research without an LLM call.
 * References use modern (Hebrew) numbering; getPassage maps Psalms for Catholic editions.
 */
export interface StoryEntry {
  title: string;
  refs: string[];
  /** Extra search terms beyond the title words. */
  keywords: string[];
}

type Row = [title: string, refs: string | string[], keywords?: string];

const ROWS: Row[] = [
  // ---- Creation and patriarchs
  ["Creation of the world", "Genesis 1:1-2:3", "beginning seven days light"],
  ["Adam and Eve in the Garden of Eden", "Genesis 2:4-25", "first man woman rib"],
  ["The fall and the serpent", "Genesis 3:1-24", "original sin apple forbidden fruit"],
  ["Cain and Abel", "Genesis 4:1-16", "brother murder offering"],
  ["Noah's ark and the flood", "Genesis 6:9-9:17", "rainbow covenant animals"],
  ["Tower of Babel", "Genesis 11:1-9", "languages confusion"],
  ["The call of Abraham", "Genesis 12:1-9", "abram promise leave country"],
  ["God's covenant with Abraham under the stars", "Genesis 15:1-21", "descendants stars"],
  ["Hagar and Ishmael", "Genesis 16:1-16", "well wilderness"],
  ["Three visitors at Mamre", "Genesis 18:1-15", "sarah laughs angels"],
  ["Sodom and Gomorrah", "Genesis 19:1-29", "lot wife pillar salt"],
  ["Birth of Isaac", "Genesis 21:1-7", "sarah laughter"],
  ["Abraham and the sacrifice of Isaac", "Genesis 22:1-19", "binding mount moriah ram"],
  ["Rebekah at the well", "Genesis 24:1-67", "isaac wife servant"],
  ["Jacob and Esau birthright", "Genesis 25:19-34", "twins stew"],
  ["Jacob steals the blessing", "Genesis 27:1-40", "isaac blind esau"],
  ["Jacob's ladder", "Genesis 28:10-22", "dream bethel stairway angels"],
  ["Jacob wrestles with God", "Genesis 32:22-32", "israel angel peniel"],
  ["Joseph's coat and his brothers", "Genesis 37:1-36", "dreams sold slavery"],
  ["Joseph interprets Pharaoh's dreams", "Genesis 41:1-57", "famine egypt cows"],
  ["Joseph forgives his brothers", "Genesis 45:1-15", "reunion reveals"],
  // ---- Exodus and wilderness
  ["Baby Moses in the basket", "Exodus 2:1-10", "nile pharaoh daughter reeds"],
  ["Moses and the burning bush", "Exodus 3:1-15", "i am who i am horeb"],
  ["The ten plagues of Egypt", ["Exodus 7:14-25", "Exodus 12:29-32"], "frogs locusts firstborn"],
  ["The first Passover", "Exodus 12:1-28", "lamb blood doorposts"],
  ["Crossing the Red Sea", "Exodus 14:5-31", "parting sea pharaoh army"],
  ["Manna from heaven", "Exodus 16:1-36", "quail bread wilderness hunger"],
  ["Moses strikes the rock", ["Exodus 17:1-7", "Numbers 20:1-13"], "water rephidim meribah thirst"],
  ["Battle with Amalek, Moses' raised hands", "Exodus 17:8-16", "aaron hur joshua"],
  ["The Ten Commandments", "Exodus 20:1-17", "sinai law tablets"],
  ["The golden calf", "Exodus 32:1-35", "idol aaron broken tablets"],
  ["The bronze serpent", "Numbers 21:4-9", "snakes healing pole"],
  ["Balaam's donkey", "Numbers 22:21-35", "talking donkey angel"],
  ["Death of Moses on Mount Nebo", "Deuteronomy 34:1-12", "promised land"],
  // ---- Conquest, judges, kings
  ["Rahab and the spies", "Joshua 2:1-24", "scarlet cord jericho"],
  ["The walls of Jericho", "Joshua 6:1-27", "trumpets march"],
  ["The sun stands still", "Joshua 10:1-15", "gibeon"],
  ["Deborah the judge", "Judges 4:1-24", "barak jael sisera"],
  ["Gideon's fleece and three hundred men", ["Judges 6:11-40", "Judges 7:1-25"], "midianites trumpets torches"],
  ["Samson and Delilah", "Judges 16:4-31", "strength hair pillars"],
  ["Ruth and Naomi", "Ruth 1:1-22", "where you go loyalty"],
  ["Ruth and Boaz", ["Ruth 2:1-23", "Ruth 4:13-17"], "gleaning redeemer"],
  ["Hannah's prayer for a son", "1 Samuel 1:1-28", "samuel temple"],
  ["God calls the boy Samuel", "1 Samuel 3:1-21", "speak lord servant listening eli"],
  ["Samuel anoints David", "1 Samuel 16:1-13", "shepherd boy jesse"],
  ["David and Goliath", "1 Samuel 17:1-54", "giant sling stone philistine"],
  ["David and Jonathan's friendship", ["1 Samuel 18:1-4", "1 Samuel 20:1-42"], "covenant friend"],
  ["David spares Saul in the cave", "1 Samuel 24:1-22", "mercy en gedi"],
  ["David dances before the ark", "2 Samuel 6:12-23", "ark of the covenant jerusalem"],
  ["David and Bathsheba, Nathan's rebuke", ["2 Samuel 11:1-27", "2 Samuel 12:1-15"], "sin repentance prophet"],
  ["Wisdom of Solomon and the two mothers", ["1 Kings 3:5-15", "1 Kings 3:16-28"], "baby judgment wise king"],
  ["Solomon builds the temple", "1 Kings 8:1-30", "dedication glory"],
  ["Elijah fed by ravens", "1 Kings 17:1-7", "drought brook"],
  ["Elijah and the widow of Zarephath", "1 Kings 17:8-24", "flour oil raised son"],
  ["Elijah and the prophets of Baal", "1 Kings 18:20-40", "mount carmel fire altar"],
  ["Elijah hears the still small voice", "1 Kings 19:1-18", "whisper cave horeb"],
  ["Elijah taken up in a chariot of fire", "2 Kings 2:1-14", "elisha whirlwind mantle"],
  ["Elisha and the widow's oil", "2 Kings 4:1-7", "jars debt"],
  ["Naaman healed of leprosy", "2 Kings 5:1-19", "jordan seven times"],
  ["Elisha's servant sees the army of angels", "2 Kings 6:8-23", "horses chariots fire"],
  ["King Josiah finds the book of the law", "2 Kings 22:1-20", "reform"],
  ["Nehemiah rebuilds the walls", ["Nehemiah 2:1-20", "Nehemiah 6:15-16"], "jerusalem"],
  ["Queen Esther saves her people", ["Esther 4:1-17", "Esther 7:1-10"], "such a time as this haman"],
  ["Job's suffering and restoration", ["Job 1:1-22", "Job 42:1-17"], "patience trial"],
  // ---- Psalms and wisdom
  ["The Lord is my shepherd", "Psalm 23:1-6", "psalm 23 green pastures valley"],
  ["Psalm 91, under his wings", "Psalm 91:1-16", "refuge protection"],
  ["Have mercy on me, O God", "Psalm 51:1-19", "miserere repentance clean heart"],
  ["Be still and know that I am God", "Psalm 46:1-11", "refuge strength"],
  ["I lift my eyes to the hills", "Psalm 121:1-8", "help keeper"],
  ["Fearfully and wonderfully made", "Psalm 139:1-18", "known womb"],
  ["Trust in the Lord with all your heart", "Proverbs 3:1-12", "wisdom paths"],
  ["A time for everything", "Ecclesiastes 3:1-15", "season"],
  ["Love is strong as death", "Song of Songs 8:6-7", "love seal"],
  // ---- Prophets
  ["Isaiah's call in the temple", "Isaiah 6:1-8", "here i am send me seraphim coal"],
  ["The virgin shall conceive, Immanuel", "Isaiah 7:10-16", "sign emmanuel prophecy"],
  ["For unto us a child is born", "Isaiah 9:2-7", "prince of peace christmas prophecy"],
  ["The suffering servant", "Isaiah 52:13-53:12", "wounded transgressions prophecy"],
  ["They shall mount up with wings like eagles", "Isaiah 40:28-31", "strength weary"],
  ["Jeremiah and the potter's house", "Jeremiah 18:1-12", "clay"],
  ["Ezekiel and the valley of dry bones", "Ezekiel 37:1-14", "breath life"],
  ["Daniel and the lions' den", "Daniel 6:1-28", "lion prayer darius"],
  ["The fiery furnace", "Daniel 3:1-30", "shadrach meshach abednego"],
  ["The writing on the wall", "Daniel 5:1-31", "belshazzar feast"],
  ["Jonah and the great fish", ["Jonah 1:1-17", "Jonah 2:1-10"], "whale storm"],
  ["Jonah and Nineveh", "Jonah 3:1-10", "repentance city"],
  ["Hosea's faithful love", "Hosea 11:1-9", "unfailing love"],
  // ---- Deuterocanon
  ["Tobit, Tobias and the angel Raphael", ["Tobit 5:1-22", "Tobit 12:6-22"], "archangel journey fish"],
  ["Judith and Holofernes", "Judith 13:1-20", "courage bethulia"],
  ["The seven brothers and their mother", "2 Maccabees 7:1-42", "martyrs faith resurrection"],
  ["Judas Maccabeus rededicates the temple", "1 Maccabees 4:36-59", "hanukkah dedication"],
  ["The souls of the righteous are in the hand of God", "Wisdom 3:1-9", "afterlife"],
  ["Honor your father and mother", "Sirach 3:1-16", "parents"],
  // ---- Advent, Nativity, childhood
  ["Annunciation to Mary", "Luke 1:26-38", "angel gabriel hail mary virgin let it be"],
  ["The Visitation of Mary to Elizabeth", "Luke 1:39-56", "magnificat blessed are you among women"],
  ["Birth of John the Baptist", "Luke 1:57-80", "zechariah benedictus"],
  ["Joseph's dream", "Matthew 1:18-25", "joseph righteous emmanuel"],
  ["The Nativity of Jesus", "Luke 2:1-20", "christmas manger bethlehem shepherds"],
  ["The visit of the Magi", "Matthew 2:1-12", "wise men star epiphany gifts gold frankincense myrrh"],
  ["Flight into Egypt", "Matthew 2:13-23", "herod holy family"],
  ["Presentation of Jesus in the temple", "Luke 2:22-40", "simeon anna candlemas nunc dimittis"],
  ["The boy Jesus in the temple", "Luke 2:41-52", "finding in the temple twelve years"],
  // ---- Ministry
  ["Baptism of Jesus", "Matthew 3:13-17", "jordan dove beloved son john baptist"],
  ["Temptation of Jesus in the desert", "Matthew 4:1-11", "devil forty days wilderness lent"],
  ["Jesus calls the first disciples", "Luke 5:1-11", "fishers of men peter catch nets"],
  ["Wedding at Cana", "John 2:1-11", "water into wine first miracle mary"],
  ["Jesus cleanses the temple", "John 2:13-22", "money changers whip"],
  ["Nicodemus and being born again", "John 3:1-21", "john 3 16 born again"],
  ["The Samaritan woman at the well", "John 4:1-42", "living water"],
  ["Sermon on the Mount, the Beatitudes", "Matthew 5:1-12", "blessed are the poor meek"],
  ["Salt and light", "Matthew 5:13-16", "light of the world"],
  ["The Lord's Prayer", "Matthew 6:9-13", "our father prayer"],
  ["Do not worry, consider the lilies", "Matthew 6:25-34", "birds anxiety"],
  ["Ask, seek, knock", "Matthew 7:7-12", "golden rule"],
  ["The calling of Matthew", "Matthew 9:9-13", "tax collector"],
  ["Jesus and the sinful woman who anoints his feet", "Luke 7:36-50", "forgiveness tears perfume"],
  ["Mary and Martha", "Luke 10:38-42", "better part"],
  ["Let the little children come to me", "Mark 10:13-16", "children blessing"],
  ["The rich young man", "Mark 10:17-27", "camel needle"],
  ["Zacchaeus in the sycamore tree", "Luke 19:1-10", "tax collector short"],
  ["The woman caught in adultery", "John 8:1-11", "first stone"],
  ["Peter's confession, you are the Christ", "Matthew 16:13-20", "keys rock church"],
  ["The Transfiguration", "Matthew 17:1-13", "mountain moses elijah shining"],
  ["The widow's offering", "Mark 12:41-44", "two coins mite"],
  ["The greatest commandment", "Mark 12:28-34", "love god neighbor"],
  ["I am the good shepherd", "John 10:1-18", "sheep gate"],
  ["I am the bread of life", "John 6:35-51", "eucharist bread"],
  ["I am the way, the truth and the life", "John 14:1-14", "father's house rooms"],
  ["I am the vine", "John 15:1-17", "branches fruit"],
  // ---- Parables
  ["Parable of the prodigal son", "Luke 15:11-32", "lost son father forgiveness"],
  ["Parable of the good Samaritan", "Luke 10:25-37", "neighbor"],
  ["Parable of the lost sheep", "Luke 15:1-7", "shepherd ninety nine"],
  ["Parable of the lost coin", "Luke 15:8-10", "woman drachma"],
  ["Parable of the sower", "Matthew 13:1-23", "seed soil"],
  ["Parable of the mustard seed", "Matthew 13:31-32", "kingdom small"],
  ["Parable of the wheat and the weeds", "Matthew 13:24-30", "tares harvest"],
  ["Parable of the hidden treasure and the pearl", "Matthew 13:44-46", "pearl of great price"],
  ["Parable of the talents", "Matthew 25:14-30", "servants money"],
  ["Parable of the ten virgins", "Matthew 25:1-13", "lamps oil bridegroom"],
  ["The sheep and the goats, the last judgment", "Matthew 25:31-46", "least of these"],
  ["Parable of the unforgiving servant", "Matthew 18:21-35", "seventy times seven"],
  ["Parable of the workers in the vineyard", "Matthew 20:1-16", "last first wages"],
  ["Parable of the rich fool", "Luke 12:13-21", "barns greed"],
  ["The rich man and Lazarus", "Luke 16:19-31", "abraham's bosom"],
  ["The Pharisee and the tax collector", "Luke 18:9-14", "humble prayer"],
  ["The persistent widow", "Luke 18:1-8", "unjust judge prayer"],
  ["The wise and foolish builders", "Matthew 7:24-27", "house on rock sand"],
  ["The two sons", "Matthew 21:28-32", "vineyard obedience"],
  ["The great banquet", "Luke 14:15-24", "wedding feast invitation"],
  // ---- Miracles
  ["Feeding of the five thousand", "John 6:1-14", "loaves fishes boy multiplication"],
  ["Jesus walks on water", "Matthew 14:22-33", "peter sinking storm"],
  ["Jesus calms the storm", "Mark 4:35-41", "wind waves boat"],
  ["Healing of the paralyzed man through the roof", "Mark 2:1-12", "friends mat forgiveness"],
  ["Jairus' daughter and the woman who touched his cloak", "Mark 5:21-43", "talitha cum bleeding"],
  ["Blind Bartimaeus", "Mark 10:46-52", "jericho sight"],
  ["The man born blind", "John 9:1-41", "mud siloam"],
  ["Ten lepers healed", "Luke 17:11-19", "gratitude thank"],
  ["Healing of the centurion's servant", "Matthew 8:5-13", "faith lord i am not worthy"],
  ["Raising of Lazarus", "John 11:1-44", "jesus wept bethany martha mary"],
  ["Raising of the widow's son at Nain", "Luke 7:11-17", "funeral compassion"],
  ["The miraculous catch of fish", "John 21:1-14", "breakfast beach 153"],
  ["Healing at the pool of Bethesda", "John 5:1-15", "paralyzed thirty eight years"],
  // ---- Passion and Easter
  ["Triumphal entry into Jerusalem", "Matthew 21:1-11", "palm sunday donkey hosanna"],
  ["Jesus washes the disciples' feet", "John 13:1-17", "holy thursday servant"],
  ["The Last Supper", "Luke 22:7-23", "eucharist bread wine passover holy thursday"],
  ["Agony in the garden of Gethsemane", "Luke 22:39-46", "prayer cup sweat blood"],
  ["Peter denies Jesus", "Luke 22:54-62", "rooster three times"],
  ["Jesus before Pilate", "John 18:28-19:16", "trial crown of thorns"],
  ["The crucifixion", "Luke 23:26-49", "cross calvary good friday golgotha"],
  ["The thief on the cross", "Luke 23:39-43", "paradise today"],
  ["Mary at the foot of the cross", "John 19:25-27", "behold your mother stabat mater"],
  ["The empty tomb, the resurrection", "Matthew 28:1-10", "easter risen"],
  ["Mary Magdalene meets the risen Jesus", "John 20:1-18", "garden gardener"],
  ["The road to Emmaus", "Luke 24:13-35", "breaking of bread"],
  ["Doubting Thomas", "John 20:24-29", "wounds believe"],
  ["Peter, do you love me", "John 21:15-19", "feed my sheep restoration"],
  ["The Great Commission", "Matthew 28:16-20", "go make disciples"],
  ["The Ascension", "Acts 1:6-11", "cloud heaven"],
  // ---- Early church
  ["Pentecost, the Holy Spirit descends", "Acts 2:1-41", "tongues of fire wind"],
  ["Peter heals the lame man at the Beautiful Gate", "Acts 3:1-10", "silver gold"],
  ["Stephen, the first martyr", "Acts 7:54-60", "stoning saint stephen"],
  ["Philip and the Ethiopian eunuch", "Acts 8:26-40", "baptism chariot"],
  ["Conversion of Saul on the road to Damascus", "Acts 9:1-19", "paul blinded light"],
  ["Peter's vision and Cornelius", "Acts 10:1-48", "gentiles sheet"],
  ["Peter freed from prison by an angel", "Acts 12:1-19", "chains"],
  ["Paul and Silas in prison, the earthquake", "Acts 16:16-40", "jailer singing"],
  ["Paul's shipwreck on Malta", "Acts 27:13-44", "storm viper"],
  ["Love is patient, love is kind", "1 Corinthians 13:1-13", "charity hymn wedding"],
  ["The armor of God", "Ephesians 6:10-18", "shield sword spiritual battle"],
  ["Nothing can separate us from the love of God", "Romans 8:31-39", "more than conquerors"],
  ["Faith, the heroes of Hebrews 11", "Hebrews 11:1-40", "hall of faith"],
  ["A new heaven and a new earth", "Revelation 21:1-7", "no more tears"],
  ["The woman clothed with the sun", "Revelation 12:1-6", "mary crown of twelve stars dragon"],
];

export const STORY_INDEX: StoryEntry[] = ROWS.map(([title, refs, keywords]) => ({
  title,
  refs: Array.isArray(refs) ? refs : [refs],
  keywords: keywords ? keywords.split(/\s+/) : [],
}));

const STOPWORDS = new Set(["the", "a", "an", "and", "of", "in", "on", "to", "at", "for", "is", "are", "his", "her", "their", "with", "from", "by", "who", "what", "story", "bible", "god", "jesus", "lord"]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("es") ? t.slice(0, -2) : t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

const INDEXED = STORY_INDEX.map((entry) => ({
  entry,
  titleTokens: new Set(tokens(entry.title)),
  allTokens: new Set([...tokens(entry.title), ...entry.keywords.flatMap(tokens)]),
}));

/** Scripture references for a free-text topic, best matches first. */
export function suggestPassages(topic: string, limit = 3): string[] {
  const query = [...new Set(tokens(topic))];
  if (query.length === 0) return [];
  const scored = INDEXED.map(({ entry, titleTokens, allTokens }) => {
    let score = 0;
    for (const q of query) {
      if (titleTokens.has(q)) score += 2;
      else if (allTokens.has(q)) score += 1;
    }
    return { entry, score: score / Math.sqrt(titleTokens.size + 1) };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const out: string[] = [];
  for (const { entry } of scored) {
    for (const ref of entry.refs) if (!out.includes(ref)) out.push(ref);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
