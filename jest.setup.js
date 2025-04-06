// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SPORTS_DATA_API_KEY = 'test-sports-data-key'
process.env.NEXT_PUBLIC_THE_ODDS_API_KEY = 'test-odds-key'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Mock axios
jest.mock('axios') 