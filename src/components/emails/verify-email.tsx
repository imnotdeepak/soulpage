import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface VerifyEmailProps {
  username: string;
  verifyUrl: string;
}

const VerifyEmail = (props: VerifyEmailProps) => {
  const { username, verifyUrl } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        Please verify your email address to complete your registration
      </Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] p-[32px] mx-auto max-w-[600px]">
            <Section>
              <Heading className="text-[24px] font-bold text-gray-900 mb-[24px] text-center">
                Verify Your Email Address
              </Heading>

              <Text className="text-[16px] text-gray-700 mb-[24px] leading-[24px]">
                Thanks {username} for signing up! To complete your registration
                and secure your account, please verify your email address by
                clicking the button below.
              </Text>

              <Section className="text-center mb-[32px]">
                <Button
                  href={verifyUrl}
                  className="bg-blue-600 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline box-border"
                >
                  Verify Email Address
                </Button>
              </Section>

              <Text className="text-[14px] text-gray-600 mb-[24px] leading-[20px]">
                This verification link will expire in 24 hours. If you
                didn&apos;t create an account, you can safely ignore this email.
              </Text>

              <Text className="text-[12px] text-gray-500 leading-[16px]">
                If you&apos;re having trouble clicking the button, copy and
                paste this URL into your browser:
                <br />
                {verifyUrl}
              </Text>
            </Section>

            <Section className="border-t border-gray-200 pt-[24px] mt-[32px]">
              <Text className="text-[12px] text-gray-500 text-center m-0">
                © 2025 Your Company Name. All rights reserved.
                <br />
                123 Business Street, Sterling, VA 20164
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerifyEmail;
