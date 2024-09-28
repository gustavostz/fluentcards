import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import VocabStore from '../../services/vocab-store';
import Header from '../../../shared/components/Header/Header.jsx';
import Loader from '../../../shared/components/Loader/Loader.jsx';
import HeadWord from '../HeadWord/HeadWord.jsx';
import Definition from '../Definition/Definition.jsx';
import ExportView from '../ExportView/ExportView.jsx';
import Context from '../Context/Context.jsx';
import styles from './Words.css';
import axios from 'axios';

/**
 * Instructions for AI explanations
 */
const instructions = `Role and Goal: As 'Anki English Explanations', I am specialized in providing clear, insightful explanations of English words in specific contexts. My primary function is to enhance the user's understanding of English vocabulary. For each word, I offer three types of explanations: a 'Direct Explanation' for a detailed, educational understanding, a 'Simple Analogy' for an easy, relatable comprehension, and the 'Etymology' to increase the users’ knowledge about this type of vocabulary helping to guess words with similar etymological roots.

Constraints: I avoid redundancy by not repeating the user-provided context. My focus is on delivering concise, accurate explanations.

Guidelines: I maintain a didactic approach, ensuring that each explanation is tailored to different learning styles. The 'Direct Explanation' is concise and comprehensive, the 'Simple Analogy' is informal and illustrative, and the 'Etymology' is focused on tracing the word’s origin, linking it to common roots or prefixes/suffixes, showing connections to related terms to help users recognize patterns across the language.

Clarification: I rely on the context given, making assumptions if necessary, to provide relevant explanations without needing further clarification.

Personalization: My responses are crafted to be informative yet approachable, aiming to aid in language learning and enhancing vocabulary understanding.

Output Format: Please output your response in JSON format with the keys "direct_explanation", "simple_analogy", and "etymology". The values should contain HTML tags as in the examples below. Do not include any other text outside the JSON.

Important: **Ensure that the JSON is properly formatted and contains no extra text or comments outside the JSON object. Do not include any explanations, apologies, or additional messages.**

For example, if I receive this message:

"""
fawning: "I put on the air of a fawning young lad."
"""

I would answer:

{
  "direct_explanation": "<b>Direct Explanation:</b><br/><br/>To be \"fawning\" means to be <b>overly flattering</b>, excessively praising, or showing affection or admiration to an excessive degree. In this context, the person is pretending or acting like a young lad who is overly eager to please and impress, possibly in a subservient or ingratiating manner.",
  "simple_analogy": "<b>Simple Analogy:</b><br/><br/>Imagine a puppy that follows someone around, wagging its tail, and trying to get attention or treats. It’s overly eager and tries hard to please. This is similar to the behavior being described as \"fawning.\"",
  "etymology": "<b>Etymology:</b><br/><br/>Comes from Old English <i>fagnian</i>, meaning \"to rejoice\" or \"show pleasure,\" which evolved into showing exaggerated affection or flattery to gain favor."
}

Another example, for the meaning of "idiosyncrasy" in this context:

"Carla always sits in the same chair at the table. It’s her little idiosyncrasy"

Could be:

{
  "direct_explanation": "<b>Direct Explanation:</b><br/><br/>An \"idiosyncrasy\" is a unique or <b>unusual habit specific to a person</b>. Carla’s insistence on sitting in the same chair is an example of her personal quirk.",
  "simple_analogy": "<b>Simple Analogy:</b><br/><br/>Think of someone who always ties their shoes a certain way—it's a small, personal habit that makes them different. That's an idiosyncrasy.",
  "etymology": "<b>Etymology:</b><br/><br/>From Greek <i>idios</i> (personal) and <i>synkrasis</i> (mixture), meaning a unique trait or habit of an individual."
}

Remember: Do not include any explanation outside the JSON format.

Obs: I don't need to repeat the phrase received (nor say "here's my response"), please just send explanations of it in the specified JSON format, including the HTML tags as in the examples.
`;

export default class Words extends PureComponent {
  constructor() {
    super();

    this.state = {
      deck: null,
      exportType: null,
      isReversed: false,
      isFetchingExplanations: false,
    };

    this._toggleReverse = () => this.setState({ isReversed: !this.state.isReversed });
  }

  async fetchAIExplanations() {
    if (!this.state.deck || this.state.isFetchingExplanations) {
      return;
    }

    this.setState({ isFetchingExplanations: true });

    const apiUrl = 'http://localhost:11434/api/generate';
    const { deck } = this.state;
    const maxRetries = 100;

    const fetchExplanationForWord = async (word, retries = 0) => {
      try {
        const response = await axios.post(
          apiUrl,
          {
            model: 'llama3',
            prompt: instructions + `\n${word.selection}: "${word.context}"`,
            stream: false,
            format: 'json',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data && response.data.response) {
          const explanation = this.parseExplanation(response.data.response);

          if (explanation) {
            const formattedExplanation = this.formatExplanation(explanation);
            this.changeDef(word, formattedExplanation);
          } else if (retries < maxRetries) {
            console.log(`Retrying for word "${word.selection}" (attempt ${retries + 1})`);
            await fetchExplanationForWord(word, retries + 1);
          } else {
            console.error(`Failed to parse explanation after ${maxRetries} retries for word "${word.selection}"`);
          }
        }
      } catch (error) {
        console.error('Error fetching explanation:', error);
        if (retries < maxRetries) {
          console.log(`Retrying for word "${word.selection}" due to error (attempt ${retries + 1})`);
          await fetchExplanationForWord(word, retries + 1);
        }
      }
    };

    const promises = deck.words.map((word) => {
      if (word.selection && word.context) {
        return fetchExplanationForWord(word);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    this.setState({ isFetchingExplanations: false });
  }

  async regenerateExplanation(item) {
    if (item.selection && item.context) {
      this.setState({ isFetchingExplanations: true });

      const apiUrl = 'http://localhost:11434/api/generate';
      const maxRetries = 3;

      const fetchExplanation = async (retries = 0) => {
        try {
          const response = await axios.post(
            apiUrl,
            {
              model: 'llama3',
              prompt: instructions + `\n${item.selection}: "${item.context}"`,
              stream: false,
              format: 'json',
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data && response.data.response) {
            const explanation = this.parseExplanation(response.data.response);

            if (explanation) {
              const formattedExplanation = this.formatExplanation(explanation);
              this.changeDef(item, formattedExplanation);
            } else if (retries < maxRetries) {
              console.log(`Retrying for word "${item.selection}" (attempt ${retries + 1})`);
              await fetchExplanation(retries + 1);
            } else {
              console.error(`Failed to parse explanation after ${maxRetries} retries for word "${item.selection}"`);
            }
          }
        } catch (error) {
          console.error('Error fetching explanation:', error);
          if (retries < maxRetries) {
            console.log(`Retrying for word "${item.selection}" due to error (attempt ${retries + 1})`);
            await fetchExplanation(retries + 1);
          }
        }
      };

      await fetchExplanation();
      this.setState({ isFetchingExplanations: false });
    }
  }

  parseExplanation(responseText) {
    try {
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON object found in the response');
      }

      const jsonString = responseText.substring(jsonStart, jsonEnd);

      const explanation = JSON.parse(jsonString);

      if (
        explanation.direct_explanation &&
        explanation.simple_analogy &&
        explanation.etymology
      ) {
        return explanation;
      }
      return null;
    } catch (error) {
      console.error('Error parsing explanation:', error);
      return null;
    }
  }

  formatExplanation(explanation) {
    return `${explanation.direct_explanation}<br/><br/>${explanation.simple_analogy}<br/><br/>${explanation.etymology}`;
  }

  exportDeck(exportType) {
    this.setState({ exportType });
  }

  changeHeadWord(item, value) {
    VocabStore.updateItem(this.props.id, item, {
      selection: value,
      def: item.def.map((defSubitem) => ({
        ...defSubitem,
        text: value,
      })),
    });
  }

  changeDef(item, value) {
    VocabStore.updateItem(this.props.id, item, {
      def: [
        {
          text: item.selection,
          tr: value.split('; ').map((text) => ({ text })),
        },
      ],
    });
  }

  changeContext(item, value) {
    VocabStore.updateItem(this.props.id, item, { context: value });
  }

  removeItem(item) {
    VocabStore.removeItem(this.props.id, item);
  }

  componentWillMount() {
    this.sub = VocabStore.subscribe(() => {
      const deck = VocabStore.getDeck(this.props.id);

      this.setState({ deck });
    });
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  /**
   * @return {JSX.Element}
   */
  render() {
    const { deck, exportType, isFetchingExplanations } = this.state;

    if (!deck) {
      return (
        <div className={styles.container}>
          <Loader />
        </div>
      );
    }

    if (exportType) {
      return (
        <div className={styles.container}>
          <div className={styles.exporting}>
            <ExportView name={deck.title || deck.language} words={deck.words} type={exportType} />
          </div>
        </div>
      );
    }

    const controls = (
      <div className={styles.controls}>
        <button
          className={styles.exportButton}
          onClick={() => this.fetchAIExplanations()}
          disabled={isFetchingExplanations}
        >
          {!isFetchingExplanations ? 'Fetch AI explanations' : 'Fetching...'}
        </button>

        <div className={styles.spacer} />

        <h4>Download the deck as:</h4>

        <button className={styles.exportButton} onClick={() => this.exportDeck('basic')}>
          Anki Basic
        </button>

        <button className={styles.exportButton} onClick={() => this.exportDeck('cloze')}>
          Anki Cloze
        </button>

        <button className={styles.exportButton} onClick={() => this.exportDeck('plain')}>
          Plain CSV
        </button>
      </div>
    );

    const words = deck.words.map((item, index) => (
      <div className={styles.entry} key={index}>
        <div className={classnames(styles.col, styles.count)}>
          <button
            className={styles.regenerateButton}
            onClick={() => this.regenerateExplanation(item)}
            disabled={isFetchingExplanations}
          >
            🔄
          </button>
          {index + 1}
        </div>

        <div className={classnames(styles.col, styles.word)}>
          <HeadWord
            lang={deck.lang}
            def={item.def}
            onChange={(val) => this.changeHeadWord(item, val)}
          />
        </div>

        <div className={classnames(styles.col, styles.definition)}>
          <Definition def={item.def} onChange={(val) => this.changeDef(item, val)} />
        </div>

        <div className={classnames(styles.col, styles.context)}>
          <Context
            selection={item.selection}
            context={item.context}
            onChange={(val) => this.changeContext(item, val)}
          />
        </div>

        <div className={classnames(styles.col, styles.remove)}>
          <button className={styles.button} onClick={() => this.removeItem(item)}>
            ×
          </button>
        </div>
      </div>
    ));

    return (
      <div>
        <Header title={deck.title || `${deck.language}`}>
          <Link to="/vocab">Decks</Link>
          {' › '}
        </Header>

        <div className={styles.container}>
          {controls}

          <div className={styles.words}>
            <div className={classnames(styles.entry, styles.header)}>
              <div className={classnames(styles.col, styles.count)}>
                <button className={styles.button} onClick={this._toggleReverse}>
                  ⇅
                </button>
              </div>
              <div className={styles.col}>Word</div>
              <div className={styles.col}>Definition</div>
              <div className={classnames(styles.col, styles.centered, styles.contextHeader)}>
                Context
              </div>
            </div>

            {this.state.isReversed ? words.reverse() : words}
          </div>

          <div className={styles.bottom}>{controls}</div>
        </div>
      </div>
    );
  }
}
