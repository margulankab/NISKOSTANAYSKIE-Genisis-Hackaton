import { useCallback, useSyncExternalStore } from 'react';
import { readSettings, subscribeToSettings } from '../menus/settings';

/** Interface languages. English is the source text; other languages translate it phrase by phrase. */
export const languages = { en: 'English', ru: 'Русский' } as const;
export type Lang = keyof typeof languages;
type Vars = Record<string, string | number>;

/**
 * Russian interface text, keyed by the English phrase. Missing phrases fall back to English,
 * so a new English string never shows as an empty label. Player-written text is never translated.
 */
const ru: Record<string, string> = {
  // Masthead and navigation
  'Main menu': 'Главное меню',
  'Examples': 'Примеры',
  'World preview': 'Превью мира',
  'Create a memory': 'Создать воспоминание',
  'Archive': 'Архив',
  '◐ View': '◐ Вид',
  'Interface atmosphere': 'Атмосфера интерфейса',
  'Auto': 'Авто',
  'Follows the world you are in': 'Следует за миром, в котором вы',
  'Pixel filter on 3D worlds': 'Пиксельный фильтр в 3D-мирах',
  'Language': 'Язык',
  'Night terminal: black and lime': 'Ночной терминал: чёрный и лайм',
  'Violet dusk': 'Фиолетовые сумерки',
  'Light screen for bright rooms': 'Светлый экран для ярких комнат',
  'Grey-teal CRT for rain, fog and snow': 'Серо-бирюзовый ЭЛТ для дождя, тумана и снега',
  'Nebula': 'Туманность',
  'Daylight': 'Дневной',
  'Fog': 'Туман',
  // Title
  'Write what happened, add a photo and the song that was playing. The day becomes a small world you can explore, save, and come back to.':
    'Напишите, что произошло, добавьте фото и песню, которая тогда звучала. День станет маленьким миром, по которому можно пройтись, сохранить его и вернуться.',
  'Title menu': 'Титульное меню',
  'New Game': 'Новая игра',
  'From words, or from a day you remember': 'Из слов или из дня, который вы помните',
  'Continue': 'Продолжить',
  'Checking saves…': 'Проверяем сохранения…',
  'Saves are unavailable in this browser': 'Сохранения недоступны в этом браузере',
  'No saved game yet': 'Сохранённых игр пока нет',
  'Load Game': 'Загрузить игру',
  'Every world and day you saved': 'Все сохранённые миры и дни',
  'Five fictional days': 'Пять вымышленных дней',
  'Settings': 'Настройки',
  'Volume, motion, language and atmosphere': 'Громкость, анимация, язык и атмосфера',
  'Latest tape': 'Последняя кассета',
  'Your latest save. Continue to walk back in.': 'Ваше последнее сохранение. Продолжите, чтобы вернуться.',
  'Example day. Your own days will appear on this tape.': 'Пример дня. Ваши дни появятся на этой кассете.',
  'Write the day': 'Опишите день', 'Add a photo': 'Добавьте фото', 'Link the song': 'Привяжите песню',
  'Walk inside it': 'Пройдитесь внутри', 'Find two memories': 'Найдите два воспоминания', 'Save it': 'Сохраните',
  'Come back any time': 'Возвращайтесь когда угодно',
  // New game
  'New game': 'Новая игра',
  'From a prompt': 'Из описания',
  'Describe any place in words. No photos or music needed.': 'Опишите любое место словами. Фото и музыка не нужны.',
  'Create a day memory': 'Воспоминание о дне',
  'Your journal, at least one photo, and the song you link with the day.': 'Ваша запись, хотя бы одно фото и песня, связанная с днём.',
  'Back to main menu': 'Назад в главное меню',
  // Prompt world
  'New game from a prompt': 'Новая игра из описания',
  'Describe a place to explore. Build a memory to meet a fictional character after two discoveries, or build a world to end your walk at a landmark.':
    'Опишите место для прогулки. Соберите воспоминание, чтобы после двух находок встретить вымышленного героя, или соберите мир, чтобы закончить путь у ориентира.',
  'Describe the world': 'Опишите мир',
  'A place name is enough. Add objects, weather, or where things belong to shape the visit.':
    'Достаточно названия места. Добавьте предметы, погоду или где что стоит, чтобы задать прогулку.',
  'Fill with an example': 'Заполнить примером',
  'Processing': 'Обработка',
  'Private on this device': 'Приватно на этом устройстве',
  'Build memory': 'Собрать воспоминание',
  'Build world': 'Собрать мир',
  'Building the scene and checking the route…': 'Собираем сцену и проверяем маршрут…',
  'In the scene': 'В сцене',
  'Built privately': 'Собрано приватно',
  'World interpretation': 'Как прочитан мир',
  'Enter world': 'Войти в мир',
  'Revise prompt': 'Изменить описание',
  'Try again': 'Повторить',
  // Song of the day
  'Song of the day': 'Песня дня',
  'Where to hear the song': 'Где послушать песню',
  'Optional. Your song keeps playing in your own music app; the world takes its tempo and mood from it.':
    'Необязательно. Песня играет в вашем музыкальном приложении, а мир берёт из неё темп и настроение.',
  'Link from your music app': 'Ссылка из музыкального приложения',
  'Spotify, Apple Music, YouTube Music, Yandex Music, SoundCloud, Deezer, TIDAL, Bandcamp or VK.':
    'Spotify, Apple Music, YouTube Music, Яндекс Музыка, SoundCloud, Deezer, TIDAL, Bandcamp или VK.',
  'Recognized: {service} {kind}. Sharing codes are removed before saving.': 'Распознано: {service}, {kind}. Коды «поделиться» удаляются перед сохранением.',
  'Artist': 'Исполнитель', 'Song': 'Песня', 'Style': 'Стиль', 'Year': 'Год', 'Not sure': 'Не знаю',
  'Tap the beat': 'Отстучать ритм',
  'Play the song in your app and tap along four or more times.': 'Включите песню в приложении и отстучите ритм четыре раза или больше.',
  'Keep tapping… {count}': 'Продолжайте… {count}',
  'Clear tempo': 'Сбросить темп',
  'How the song shapes the world': 'Как песня меняет мир',
  'Shapes this world': 'Задаёт настроение мира',
  // Game session
  'Prompt world': 'Мир из описания',
  'Pause': 'Пауза',
  '{count} of 2 discoveries found': 'Найдено {count} из 2',
  'Find it in the world': 'Найдите в мире',
  'Found': 'Найдено',
  'Reveal': 'Открыть',
  'World complete': 'Мир пройден',
  'Memory complete': 'Воспоминание завершено',
  'Replay visit': 'Пройти заново',
  'How this world was built': 'Как собран этот мир',
  'Full screen': 'Во весь экран',
  'Interact': 'Действие',
  'WASD to walk, drag or ← → to look, Shift to run, E to interact, V to change view, Esc to pause': 'WASD — идти, мышь или ← → — смотреть, Shift — бежать, E — действие, V — вид, Esc — пауза',
  'First person': 'От первого лица',
  'Third person': 'От третьего лица',
  'Camera': 'Камера',
  'Ink outlines and toon shading on 3D worlds': 'Чернильные контуры и мультяшный свет в 3D-мирах',
  'Exit full screen': 'Выйти из полноэкранного',
  'WASD or arrow keys to walk, Shift to run, E to interact, Esc to pause': 'WASD или стрелки — идти, Shift — бежать, E — действие, Esc — пауза',
  'Music is ready. It starts with your first step, or press Play.': 'Музыка готова. Она включится с первым шагом или по кнопке.',
  'Reset position': 'Вернуться к старту',
  // Soundtrack
  'World soundtrack': 'Саундтрек мира',
  'Soundtrack': 'Саундтрек',
  'Silence': 'Тишина',
  'Mute soundtrack': 'Выключить звук',
  'Play soundtrack': 'Играть саундтрек',
  'Pause soundtrack': 'Пауза саундтрека',
  'Preview soundtrack': 'Прослушать саундтрек',
  'Upload an authorized soundtrack': 'Загрузить свой разрешённый трек',
  // Pause menu
  'Paused': 'Пауза',
  'Resume': 'Продолжить',
  'Save Game': 'Сохранить игру',
  'Save & Quit': 'Сохранить и выйти',
  'Return to Main Menu': 'В главное меню',
  'Leave without saving?': 'Выйти без сохранения?',
  'Your latest progress in this world has not been saved.': 'Последний прогресс в этом мире не сохранён.',
  'Save and leave': 'Сохранить и выйти',
  'Leave without saving': 'Выйти без сохранения',
  'Keep playing': 'Играть дальше',
  'Saving…': 'Сохраняем…',
  'Press Esc to resume': 'Esc — продолжить',
  // Settings
  'Soundtrack volume: {value}%': 'Громкость саундтрека: {value}%',
  'Reduced motion': 'Меньше анимации',
  'Follow this device': 'Как на устройстве',
  'Always reduce motion': 'Всегда уменьшать',
  'Full motion': 'Полная анимация',
  'Atmosphere': 'Атмосфера',
  'Auto: follow the world you are in': 'Авто: следовать за миром, в котором вы',
  'Pixel filter on 3D worlds (also lighter on older devices)': 'Пиксельный фильтр в 3D-мирах (и легче для старых устройств)',
  'Entering a world': 'Вход в мир',
  'Start the soundtrack when I enter a world': 'Включать саундтрек при входе в мир',
  'Switch to full screen when I enter a world': 'Переходить во весь экран при входе в мир',
  'Settings saved in this browser.': 'Настройки сохранены в этом браузере.',
  // Transition
  'reading your words': 'читаем ваши слова',
  'placing {count} objects': 'расставляем объекты: {count}',
  'tuning soundtrack: {track}': 'настраиваем саундтрек: {track}',
  'silence, by choice': 'тишина, по выбору',
  'opening the world': 'открываем мир',
};

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, ru };

export function translate(lang: Lang, text: string, vars?: Vars) {
  const template = dictionaries[lang][text] ?? text;
  return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match)) : template;
}

const langOf = () => readSettings().lang;

export function useLang(): Lang {
  return useSyncExternalStore(subscribeToSettings, langOf, () => 'en');
}

/** Translate interface text in the current language; re-renders when the language changes. */
export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}

/** Phrases outside React components. */
export const t = (text: string, vars?: Vars) => translate(readSettings().lang, text, vars);

export function hasTranslation(lang: Lang, text: string) {
  return lang === 'en' || text in dictionaries[lang];
}
