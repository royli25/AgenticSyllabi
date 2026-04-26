from uagents import Bureau
from backend.agents.syllabus_parser_agent import syllabus_parser
from backend.agents.interest_agent import interest_agent
from backend.agents.research_agent import research_agent
from backend.agents.course_plan_agent import course_plan_agent
from backend.agents.content_generator_agent import content_generator

bureau = Bureau(port=8001, endpoint="http://localhost:8001/submit")
bureau.add(syllabus_parser)
bureau.add(interest_agent)
bureau.add(research_agent)
bureau.add(course_plan_agent)
bureau.add(content_generator)


def run_bureau():
    bureau.run()


if __name__ == "__main__":
    run_bureau()
